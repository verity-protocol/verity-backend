import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Address,
  Keypair,
  rpc as SorobanRpc,
  scValToNative,
  Transaction,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { StellarService } from '../stellar/stellar.service';
import { SigningKeysService } from '../stellar/signing-keys.service';
import {
  DidPrepareExpiredError,
  DidSubmissionContentionError,
} from '../stellar/stellar-errors';
import { Did } from './entities/did.entity';
import { Wallet } from './entities/wallet.entity';
import { Nullifier } from './entities/nullifier.entity';
import {
  isValidStellarAddress,
  normalizeDidIdentifier,
  toCanonicalDid,
} from './did-identifier';

export interface PrepareDidResult {
  method: string;
  contractId: string;
  did?: string;
  txXdr: string;
  authExpirationLedgers: number[];
  validUntilLedger?: number;
}

export interface ConfirmCreateInput {
  txXdr: string;
  nullifierHash?: string;
}

export interface ConfirmLinkInput {
  txXdr: string;
}

export interface ConfirmUnlinkInput {
  txXdr: string;
}

export interface DidResolution {
  did: string;
  owner: string;
  isVerified: boolean;
  wallets: string[];
  credentials: Array<{
    type: string;
    issuer: string;
    issuedAt: Date;
    isRevoked: boolean;
  }>;
  createdAt: Date;
}

@Injectable()
export class DidService {
  private readonly logger = new Logger(DidService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly stellarService: StellarService,
    private readonly signingKeys: SigningKeysService,
    @InjectRepository(Did)
    private readonly didRepository: Repository<Did>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Nullifier)
    private readonly nullifierRepository: Repository<Nullifier>,
  ) {}

  async prepareCreate(ownerAddress: string): Promise<PrepareDidResult> {
    this.requireWalletAddress(ownerAddress);
    const feeSponsor = this.signingKeys.getFeeSponsorKeypair();
    const contractId = this.contractId();
    const prepared = await this.stellarService.prepareContractCall({
      sourceAddress: feeSponsor.publicKey(),
      contractId,
      method: 'create_did',
      args: [new Address(ownerAddress)],
    });
    const did = this.toDidHex(prepared.retval);
    return {
      method: 'create_did',
      contractId,
      did: did ? toCanonicalDid(did) : undefined,
      txXdr: prepared.transaction.toXDR(),
      authExpirationLedgers: prepared.authExpirationLedgers,
      validUntilLedger: this.minLedger(prepared.authExpirationLedgers),
    };
  }

  async confirmCreate(input: ConfirmCreateInput): Promise<DidResolution> {
    let didHex = '';
    await this.confirm({
      method: 'create_did',
      txXdr: input.txXdr,
      onSuccess: async (transaction, result) => {
        didHex = this.didFromCreateResult(result);
        const owner = this.walletFromTransaction(transaction, 0);
        const didEntity = await this.didRepository.findOne({
          where: { address: didHex },
        });
        if (!didEntity) {
          const created = await this.didRepository.save(
            this.didRepository.create({
              address: didHex,
              owner,
              isVerified: false,
            }),
          );
          await this.walletRepository.save(
            this.walletRepository.create({
              address: owner,
              didId: created.id,
              isPrimary: true,
            }),
          );
        }
      },
    });
    if (input.nullifierHash) {
      await this.storeNullifier(didHex, input.nullifierHash);
    }
    return this.resolveEntity(didHex);
  }

  async prepareLink(
    didIdentifier: string,
    walletAddress: string,
  ): Promise<PrepareDidResult> {
    const didHex = normalizeDidIdentifier(didIdentifier);
    this.requireWalletAddress(walletAddress);
    const feeSponsor = this.signingKeys.getFeeSponsorKeypair();
    const contractId = this.contractId();
    const prepared = await this.stellarService.prepareContractCall({
      sourceAddress: feeSponsor.publicKey(),
      contractId,
      method: 'link_wallet',
      args: [Buffer.from(didHex, 'hex'), new Address(walletAddress)],
    });
    return {
      method: 'link_wallet',
      contractId,
      did: toCanonicalDid(didHex),
      txXdr: prepared.transaction.toXDR(),
      authExpirationLedgers: prepared.authExpirationLedgers,
      validUntilLedger: this.minLedger(prepared.authExpirationLedgers),
    };
  }

  async confirmLink(input: ConfirmLinkInput): Promise<DidResolution> {
    let didHex = '';
    await this.confirm({
      method: 'link_wallet',
      txXdr: input.txXdr,
      onSuccess: async (transaction, _result) => {
        didHex = this.didFromTransaction(transaction, 0);
        const walletAddress = this.walletFromTransaction(transaction, 1);
        const didEntity = await this.didRepository.findOne({
          where: { address: didHex },
        });
        if (!didEntity) {
          throw new NotFoundException(
            `DID not found in database: ${toCanonicalDid(didHex)}`,
          );
        }
        const existing = await this.walletRepository.findOne({
          where: { didId: didEntity.id, address: walletAddress },
        });
        if (!existing) {
          await this.walletRepository.save(
            this.walletRepository.create({
              address: walletAddress,
              didId: didEntity.id,
              isPrimary: false,
            }),
          );
        }
      },
    });
    return this.resolveEntity(didHex);
  }

  async prepareUnlink(
    didIdentifier: string,
    walletAddress: string,
    callerAddress: string,
  ): Promise<PrepareDidResult> {
    const didHex = normalizeDidIdentifier(didIdentifier);
    this.requireWalletAddress(walletAddress);
    this.requireWalletAddress(callerAddress);
    const feeSponsor = this.signingKeys.getFeeSponsorKeypair();
    const contractId = this.contractId();
    const prepared = await this.stellarService.prepareContractCall({
      sourceAddress: feeSponsor.publicKey(),
      contractId,
      method: 'unlink_wallet',
      args: [
        Buffer.from(didHex, 'hex'),
        new Address(walletAddress),
        new Address(callerAddress),
      ],
    });
    return {
      method: 'unlink_wallet',
      contractId,
      did: toCanonicalDid(didHex),
      txXdr: prepared.transaction.toXDR(),
      authExpirationLedgers: prepared.authExpirationLedgers,
      validUntilLedger: this.minLedger(prepared.authExpirationLedgers),
    };
  }

  async confirmUnlink(input: ConfirmUnlinkInput): Promise<DidResolution> {
    let didHex = '';
    await this.confirm({
      method: 'unlink_wallet',
      txXdr: input.txXdr,
      onSuccess: async (transaction, _result) => {
        didHex = this.didFromTransaction(transaction, 0);
        const walletAddress = this.walletFromTransaction(transaction, 1);
        const didEntity = await this.didRepository.findOne({
          where: { address: didHex },
        });
        if (!didEntity) {
          throw new NotFoundException(
            `DID not found in database: ${toCanonicalDid(didHex)}`,
          );
        }
        await this.walletRepository.delete({
          didId: didEntity.id,
          address: walletAddress,
        });
      },
    });
    return this.resolveEntity(didHex);
  }

  async resolve(identifier: string): Promise<DidResolution> {
    const didHex = normalizeDidIdentifier(identifier);
    return this.resolveEntity(didHex);
  }

  async findByWallet(walletAddress: string): Promise<Did | null> {
    this.requireWalletAddress(walletAddress);
    const feeSponsor = this.signingKeys.getFeeSponsorKeypair();
    const result = await this.stellarService.queryContract(
      this.contractId(),
      'get_did_for_wallet',
      [new Address(walletAddress)],
      feeSponsor.publicKey(),
    );
    const didHex = this.toDidHex(result);
    if (!didHex) {
      return null;
    }
    const record = await this.didRepository.findOne({
      where: { address: didHex },
      relations: ['wallets'],
    });
    return record ?? null;
  }

  async listWallets(identifier: string): Promise<Wallet[]> {
    const didHex = normalizeDidIdentifier(identifier);
    const didEntity = await this.didRepository.findOne({
      where: { address: didHex },
      relations: ['wallets'],
    });
    if (!didEntity) {
      throw new NotFoundException(`DID not found: ${toCanonicalDid(didHex)}`);
    }
    return didEntity.wallets || [];
  }

  async setVerification(
    identifier: string,
    isVerified: boolean,
  ): Promise<DidResolution> {
    const didHex = normalizeDidIdentifier(identifier);
    const admin = this.signingKeys.getAdminKeypair();
    const contractId = this.contractId();
    const prepared = await this.stellarService.prepareContractCall({
      sourceAddress: admin.publicKey(),
      contractId,
      method: 'set_verified',
      args: [Buffer.from(didHex, 'hex'), isVerified],
    });
    await this.submitOrConflict({
      transaction: prepared.transaction,
      signers: [admin],
      sourceAddress: admin.publicKey(),
      validUntilLedger: this.minLedger(prepared.authExpirationLedgers),
    });
    const didEntity = await this.didRepository.findOne({
      where: { address: didHex },
    });
    if (didEntity) {
      didEntity.isVerified = isVerified;
      await this.didRepository.save(didEntity);
    }
    return this.resolveEntity(didHex);
  }

  private async confirm(input: {
    method: string;
    txXdr: string;
    onSuccess: (
      transaction: Transaction,
      result: SorobanRpc.Api.GetTransactionResponse,
    ) => Promise<void>;
  }): Promise<void> {
    const feeSponsor = this.signingKeys.getFeeSponsorKeypair();
    const transaction = this.parseTransaction(input.txXdr);
    const validUntilLedger = this.minLedger(
      this.stellarService.extractAuthExpirationLedgers(transaction),
    );
    const result = await this.submitOrConflict({
      transaction,
      signers: [feeSponsor],
      sourceAddress: feeSponsor.publicKey(),
      validUntilLedger,
    });
    await input.onSuccess(transaction, result);
  }

  private async submitOrConflict(input: {
    transaction: Transaction;
    signers: Keypair[];
    sourceAddress: string;
    validUntilLedger?: number;
  }): Promise<SorobanRpc.Api.GetTransactionResponse> {
    try {
      return await this.stellarService.submitContractTransaction({
        transaction: input.transaction,
        signers: input.signers,
        sourceAddress: input.sourceAddress,
        isValidBeforeSubmit:
          input.validUntilLedger !== undefined
            ? async () => {
                const latest =
                  await this.stellarService.getLatestLedgerSequence();
                if (latest > (input.validUntilLedger as number)) {
                  throw new DidPrepareExpiredError();
                }
              }
            : undefined,
      });
    } catch (error) {
      if (
        error instanceof DidPrepareExpiredError ||
        error instanceof DidSubmissionContentionError
      ) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  private async resolveEntity(didHex: string): Promise<DidResolution> {
    const didEntity = await this.didRepository.findOne({
      where: { address: didHex },
      relations: ['wallets', 'credentials', 'credentials.issuer'],
    });
    if (!didEntity) {
      throw new NotFoundException(`DID not found: ${toCanonicalDid(didHex)}`);
    }
    return {
      did: toCanonicalDid(didEntity.address),
      owner: didEntity.owner,
      isVerified: didEntity.isVerified,
      wallets: (didEntity.wallets || []).map((w) => w.address),
      credentials: (didEntity.credentials || [])
        .filter((c) => !c.isRevoked)
        .map((c) => ({
          type: c.credentialType,
          issuer: c.issuer?.address || 'unknown',
          issuedAt: c.issuedAt,
          isRevoked: c.isRevoked,
        })),
      createdAt: didEntity.createdAt,
    };
  }

  private async storeNullifier(
    didHex: string,
    nullifierHash: string,
  ): Promise<void> {
    const existing = await this.nullifierRepository.findOne({
      where: { hash: nullifierHash },
    });
    if (existing) {
      return;
    }
    const didEntity = await this.didRepository.findOne({
      where: { address: didHex },
    });
    await this.nullifierRepository.save(
      this.nullifierRepository.create({
        hash: nullifierHash,
        didId: didEntity?.id ?? null,
      }),
    );
  }

  private parseTransaction(txXdr: string): Transaction {
    try {
      const parsed = TransactionBuilder.fromXDR(txXdr, this.passphrase);
      if ('innerTransaction' in parsed) {
        throw new Error('fee-bump envelopes are not supported');
      }
      return parsed;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid transaction XDR');
    }
  }

  private didFromCreateResult(
    result: SorobanRpc.Api.GetTransactionResponse,
  ): string {
    const successful =
      result as SorobanRpc.Api.GetSuccessfulTransactionResponse;
    if (!successful.returnValue) {
      throw new Error('create_did submission returned no DID identifier');
    }
    const native = scValToNative(successful.returnValue);
    const hex = this.toDidHex(native);
    if (!hex) {
      throw new Error('create_did submission returned no DID identifier');
    }
    return hex;
  }

  private didFromTransaction(transaction: Transaction, index: number): string {
    const args = this.invokeArgs(transaction);
    return Buffer.from(args[index].bytes()).toString('hex');
  }

  private walletFromTransaction(
    transaction: Transaction,
    index: number,
  ): string {
    const args = this.invokeArgs(transaction);
    return Address.fromScVal(args[index]).toString();
  }

  private invokeArgs(transaction: Transaction): xdr.ScVal[] {
    const [operation] = transaction.operations;
    if (!operation || operation.type !== 'invokeHostFunction') {
      throw new BadRequestException(
        'Transaction must contain a single invokeHostFunction operation',
      );
    }
    return operation.func.invokeContract().args();
  }

  private toDidHex(value: unknown): string | undefined {
    if (value instanceof Uint8Array && value.length > 0) {
      return Buffer.from(value).toString('hex');
    }
    return undefined;
  }

  private minLedger(ledgers: number[]): number | undefined {
    if (ledgers.length === 0) {
      return undefined;
    }
    return Math.min(...ledgers);
  }

  private requireWalletAddress(address: string): void {
    if (!isValidStellarAddress(address)) {
      throw new BadRequestException(`Invalid Stellar address: ${address}`);
    }
  }

  private contractId(): string {
    const contractId = this.configService.get<string>(
      'app.stellar.didRegistryContractId',
    );
    if (!contractId) {
      throw new ServiceUnavailableException(
        'DID operations are unavailable: STELLAR_CONTRACT_DID_REGISTRY is not configured',
      );
    }
    return contractId;
  }

  private get passphrase(): string {
    return (
      this.configService.get<string>('app.stellar.passphrase') ||
      'Test SDF Future Network ; October 2022'
    );
  }
}
