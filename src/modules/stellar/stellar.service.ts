import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Account,
  BASE_FEE,
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
  nativeToScVal,
  rpc as SorobanRpc,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import type { Keypair, Transaction } from '@stellar/stellar-sdk';
import { DidSubmissionContentionError } from './stellar-errors';
import { SubmitQueue } from './submit-queue';

export interface SubmitContractTransactionInput {
  transaction: Transaction;
  sourceAddress: string;
  signers: Keypair[];
  isValidBeforeSubmit?: () => Promise<void>;
}

export interface PrepareContractCallInput {
  sourceAddress: string;
  contractId: string;
  method: string;
  args?: unknown[];
}

export interface PreparedContractCall {
  transaction: Transaction;
  retval?: unknown;
  authExpirationLedgers: number[];
}

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private readonly rpcServer: SorobanRpc.Server;
  private readonly horizonServer: Horizon.Server;
  private readonly horizonUrl: string;
  private readonly rpcUrl: string;
  private readonly passphrase: string;

  private static readonly MAX_POLL_ATTEMPTS = 30;
  private static readonly POLL_INTERVAL_MS = 1000;
  private static readonly MAX_SUBMIT_RETRIES = 3;
  private static readonly SUBMIT_RETRY_BACKOFF_MS = 50;

  constructor(
    private readonly configService: ConfigService,
    private readonly submitQueue: SubmitQueue,
  ) {
    this.horizonUrl =
      this.configService.get<string>('app.stellar.horizonUrl') || '';
    this.rpcUrl = this.configService.get<string>('app.stellar.rpcUrl') || '';
    this.passphrase =
      this.configService.get<string>('app.stellar.passphrase') || '';
    this.rpcServer = new SorobanRpc.Server(this.rpcUrl);
    this.horizonServer = new Horizon.Server(this.horizonUrl);
    this.logger.log(
      `StellarService initialized (network: ${this.configService.get('app.stellar.network')})`,
    );
  }

  /**
   * Query a Soroban smart contract method (read-only).
   *
   * Builds an InvokeHostFunction operation, simulates it against the
   * current ledger state via Soroban RPC `simulateTransaction`, and
   * returns the parsed return value. No transaction is submitted.
   *
   * If the first simulation only returns the required footprint, the
   * transaction is patched with it and simulated again.
   *
   * @param contractId - The Soroban contract address (starts with C...)
   * @param method - The contract method name to call
   * @param args - Optional arguments to pass to the method
   * @param sourceAddress - A funded Stellar account to act as the simulation source
   * @returns The parsed return value from the contract method
   */
  async queryContract(
    contractId: string,
    method: string,
    args?: unknown[],
    sourceAddress?: string,
  ): Promise<unknown> {
    if (!sourceAddress) {
      throw new Error(
        'queryContract requires a funded sourceAddress to simulate from',
      );
    }
    const safeArgs = args ?? [];
    const scVals = safeArgs.map((arg) => nativeToScVal(arg));
    let tx = await this.buildRawInvokeTransaction(
      sourceAddress,
      contractId,
      method,
      scVals,
    );

    const simulation = await this.rpcServer.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(simulation)) {
      throw new Error(
        `Contract simulation failed for ${contractId}.${method}: ${simulation.error}`,
      );
    }

    let retval = simulation.result?.retval;
    if (retval === undefined) {
      tx = TransactionBuilder.cloneFrom(tx, {
        fee: tx.fee,
        sorobanData: simulation.transactionData.build(),
      }).build();
      const resimulation = await this.rpcServer.simulateTransaction(tx);
      if (SorobanRpc.Api.isSimulationError(resimulation)) {
        throw new Error(
          `Contract simulation failed for ${contractId}.${method}: ${resimulation.error}`,
        );
      }
      retval = resimulation.result?.retval;
    }

    if (retval === undefined) {
      throw new Error(`Contract ${contractId}.${method} returned no result`);
    }
    return scValToNative(retval);
  }

  /**
   * Sign and submit a Soroban transaction to the Stellar network.
   *
   * Signs the transaction with the provided keypairs, submits it via
   * Soroban RPC `sendTransaction`, then polls `getTransaction` until the
   * network finalizes it. Contract invocations must go through RPC rather
   * than Horizon's `submitTransaction`.
   *
   * @param transaction - A built (preferably prepared) Transaction
   * @param signers - Keypairs to sign the transaction with
   * @returns The finalized transaction response once the network accepts it
   */
  async submitTransaction(
    transaction: Transaction,
    signers: Keypair[],
  ): Promise<unknown> {
    for (const signer of signers) {
      transaction.sign(signer);
    }

    const response = await this.rpcServer.sendTransaction(transaction);
    if (response.status === 'ERROR') {
      throw new Error(`Transaction ${response.hash} rejected by the network`);
    }

    for (
      let attempt = 0;
      attempt < StellarService.MAX_POLL_ATTEMPTS;
      attempt += 1
    ) {
      const status = await this.rpcServer.getTransaction(response.hash);
      if (status.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
        return status;
      }
      if (status.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
        throw new Error(`Transaction ${response.hash} failed on chain`);
      }
      await this.sleep(StellarService.POLL_INTERVAL_MS);
    }

    throw new Error(`Timed out waiting for transaction ${response.hash}`);
  }

  async submitContractTransaction(
    input: SubmitContractTransactionInput,
  ): Promise<SorobanRpc.Api.GetTransactionResponse> {
    return this.submitQueue.enqueue(input.sourceAddress, () =>
      this.submitWithContentionRetry(input),
    );
  }

  private async submitWithContentionRetry(
    input: SubmitContractTransactionInput,
  ): Promise<SorobanRpc.Api.GetTransactionResponse> {
    for (
      let attempt = 0;
      attempt < StellarService.MAX_SUBMIT_RETRIES;
      attempt += 1
    ) {
      if (input.isValidBeforeSubmit) {
        await input.isValidBeforeSubmit();
      }

      const account = await this.getSourceAccount(input.sourceAddress);
      const rebuilt = this.rebuildWithFreshSource(input.transaction, account);
      const prepared = await this.rpcServer.prepareTransaction(rebuilt);
      for (const signer of input.signers) {
        prepared.sign(signer);
      }

      const response = await this.rpcServer.sendTransaction(prepared);
      if (response.status === 'ERROR') {
        if (StellarService.isBadSeqResponse(response)) {
          this.logger.warn(
            `Submission for ${input.sourceAddress} collided on attempt ${attempt + 1}; rebuilding`,
          );
          await this.sleep(StellarService.SUBMIT_RETRY_BACKOFF_MS);
          continue;
        }
        throw new Error(`Transaction ${response.hash} rejected by the network`);
      }

      const finalStatus = await this.pollTransaction(response.hash);
      if (finalStatus.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
        if (
          StellarService.isBadSeqResult(
            (finalStatus as SorobanRpc.Api.GetFailedTransactionResponse)
              .resultXdr,
          )
        ) {
          this.logger.warn(
            `Submission for ${input.sourceAddress} collided on chain on attempt ${attempt + 1}; rebuilding`,
          );
          await this.sleep(StellarService.SUBMIT_RETRY_BACKOFF_MS);
          continue;
        }
        throw new Error(`Transaction ${response.hash} failed on chain`);
      }
      return finalStatus;
    }

    throw new DidSubmissionContentionError();
  }

  private async pollTransaction(
    hash: string,
  ): Promise<SorobanRpc.Api.GetTransactionResponse> {
    for (
      let attempt = 0;
      attempt < StellarService.MAX_POLL_ATTEMPTS;
      attempt += 1
    ) {
      const status = await this.rpcServer.getTransaction(hash);
      if (
        status.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS ||
        status.status === SorobanRpc.Api.GetTransactionStatus.FAILED
      ) {
        return status;
      }
      await this.sleep(StellarService.POLL_INTERVAL_MS);
    }
    throw new Error(`Timed out waiting for transaction ${hash}`);
  }

  private rebuildWithFreshSource(
    transaction: Transaction,
    account: Account,
  ): Transaction {
    const [operation] = transaction.operations;
    if (!operation || operation.type !== 'invokeHostFunction') {
      throw new Error(
        'rebuildWithFreshSource requires a single invokeHostFunction operation',
      );
    }
    const rebuilt = new TransactionBuilder(account, {
      fee: transaction.fee,
      networkPassphrase: this.passphrase || Networks.TESTNET,
    })
      .addOperation(
        Operation.invokeHostFunction({
          source: operation.source,
          func: operation.func,
          auth: operation.auth,
        }),
      )
      .setTimeout(0);
    return rebuilt.build();
  }

  private static isBadSeqResponse(
    response: SorobanRpc.Api.SendTransactionResponse,
  ): boolean {
    if (response.status !== 'ERROR') {
      return false;
    }
    return StellarService.isBadSeqResult(response.errorResult);
  }

  private static isBadSeqResult(resultXdr?: xdr.TransactionResult): boolean {
    if (!resultXdr) {
      return false;
    }
    try {
      return (
        resultXdr.result().switch().value ===
        xdr.TransactionResultCode.txBadSeq().value
      );
    } catch {
      return false;
    }
  }

  /**
   * Stream Horizon operations/effects for indexing into PostgreSQL.
   *
   * TODO: Implement using Horizon server.stream()
   * - Create a cursor-based event stream
   * - Filter by contract ID and event type
   * - For each event: parse the XDR, extract event data, write to IndexerEvent table
   * - Handle stream reconnection on errors
   *
   * Uses Horizon SSE (Server-Sent Events) for real-time streaming.
   *
   * @param cursor - Horizon cursor to start from (ledger sequence)
   * @param filters - Optional filters for contract ID, event type
   */
  async watchEvents(
    _cursor: string,
    _filters?: { contractId?: string; eventType?: string },
  ): Promise<void> {
    // TODO: Implement Horizon event streaming
    throw new Error('StellarService.watchEvents not yet implemented');
  }

  /**
   * Get the native (XLM) balance for a Stellar account.
   *
   * Fetches the account from Horizon and returns the native balance,
   * used to check an account has sufficient funds before DID creation.
   *
   * @param address - The Stellar public key (starts with G...)
   * @returns The account's native balance in lumens
   */
  async getAccountBalance(address: string): Promise<string> {
    const info = await this.horizonServer.accounts().accountId(address).call();
    const native = info.balances.find(
      (balance) => balance.asset_type === 'native',
    );
    if (!native) {
      throw new Error(`Account ${address} has no native balance`);
    }
    return native.balance;
  }

  /**
   * Build a Soroban invoke contract transaction.
   *
   * Fetches the source account's sequence number from Horizon, builds an
   * InvokeHostFunction operation, then runs `prepareTransaction` against
   * Soroban RPC to simulate the invocation and apply the ledger footprint,
   * resource fee, and authorization entries. The returned transaction is
   * ready for signing and submission.
   *
   * @param sourceAddress - The account that will pay fees and sign
   * @param contractId - The Soroban contract address
   * @param method - The contract method to invoke
   * @param args - Arguments for the method
   * @returns A prepared Transaction ready for signing
   */
  async buildInvokeContractTx(
    sourceAddress: string,
    contractId: string,
    method: string,
    args?: unknown[],
  ): Promise<Transaction> {
    const prepared = await this.prepareContractCall({
      sourceAddress,
      contractId,
      method,
      args,
    });
    return prepared.transaction;
  }

  async prepareContractCall(
    input: PrepareContractCallInput,
  ): Promise<PreparedContractCall> {
    const { sourceAddress, contractId, method } = input;
    const scVals = (input.args ?? []).map((arg) => nativeToScVal(arg));
    const tx = await this.buildRawInvokeTransaction(
      sourceAddress,
      contractId,
      method,
      scVals,
    );
    const prepared = await this.rpcServer.prepareTransaction(tx);
    this.logger.debug(
      `Prepared ${contractId}.${method} for ${sourceAddress} (${scVals.length} args)`,
    );
    let retval: unknown;
    const simulation = (
      prepared as { simulation?: SorobanRpc.Api.SimulateTransactionResponse }
    ).simulation;
    if (
      simulation &&
      SorobanRpc.Api.isSimulationSuccess(simulation) &&
      simulation.result
    ) {
      retval = scValToNative(simulation.result.retval);
    }
    return {
      transaction: prepared,
      retval,
      authExpirationLedgers: this.extractAuthExpirationLedgers(prepared),
    };
  }

  async getLatestLedgerSequence(): Promise<number> {
    const response = await this.rpcServer.getLatestLedger();
    return response.sequence;
  }

  extractAuthExpirationLedgers(transaction: Transaction): number[] {
    const [operation] = transaction.operations;
    if (!operation || operation.type !== 'invokeHostFunction') {
      return [];
    }
    const ledgers: number[] = [];
    for (const entry of operation.auth ?? []) {
      const credentials = entry.credentials();
      if (credentials.switch().name === 'sorobanCredentialsAddress') {
        ledgers.push(credentials.address().signatureExpirationLedger());
      }
    }
    return ledgers;
  }

  private async buildRawInvokeTransaction(
    sourceAddress: string,
    contractId: string,
    method: string,
    args: ReturnType<typeof nativeToScVal>[],
  ): Promise<Transaction> {
    const source = await this.getSourceAccount(sourceAddress);
    return new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: this.passphrase || Networks.TESTNET,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: contractId,
          function: method,
          args,
        }),
      )
      .setTimeout(0)
      .build();
  }

  private async getSourceAccount(sourceAddress: string): Promise<Account> {
    const info = await this.horizonServer
      .accounts()
      .accountId(sourceAddress)
      .call();
    return new Account(sourceAddress, info.sequence);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
