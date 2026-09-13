import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  Account,
  Keypair,
  Operation,
  SorobanDataBuilder,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import type { Transaction } from '@stellar/stellar-sdk';
import {
  DidPrepareExpiredError,
  DidSubmissionContentionError,
} from './stellar-errors';
import { StellarService } from './stellar.service';
import { SubmitQueue } from './submit-queue';

jest.mock('@stellar/stellar-sdk', () => {
  const actual = jest.requireActual('@stellar/stellar-sdk');
  const rpcServer = {
    simulateTransaction: jest.fn(),
    prepareTransaction: jest.fn(),
    sendTransaction: jest.fn(),
    getTransaction: jest.fn(),
  };
  const accountIdCall = jest.fn();
  const accountsChain = {
    accountId: jest.fn(() => ({ call: accountIdCall })),
  };
  const horizonServer = {
    accounts: jest.fn(() => accountsChain),
  };
  const rpc = { ...actual.rpc, Server: jest.fn(() => rpcServer) };
  const Horizon = { ...actual.Horizon, Server: jest.fn(() => horizonServer) };
  return { ...actual, rpc, Horizon, __mocks: { rpcServer, horizonServer } };
});

const SDK_MOCK = jest.requireMock(
  '@stellar/stellar-sdk',
) as typeof import('@stellar/stellar-sdk') & {
  __mocks: {
    rpcServer: {
      simulateTransaction: jest.Mock;
      prepareTransaction: jest.Mock;
      sendTransaction: jest.Mock;
      getTransaction: jest.Mock;
    };
    horizonServer: {
      accounts: jest.Mock;
    };
  };
};

const CONTRACT_ID = 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE';
const SOURCE_ADDRESS =
  'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

describe('StellarService', () => {
  let service: StellarService;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    const { rpcServer, horizonServer } = SDK_MOCK.__mocks;
    rpcServer.simulateTransaction.mockReset();
    rpcServer.prepareTransaction.mockReset();
    rpcServer.sendTransaction.mockReset();
    rpcServer.getTransaction.mockReset();
    (
      horizonServer.accounts().accountId(SOURCE_ADDRESS).call as jest.Mock
    ).mockReset();
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          'app.stellar.horizonUrl': 'https://horizon-testnet.stellar.org',
          'app.stellar.rpcUrl': 'https://soroban-testnet.stellar.org',
          'app.stellar.passphrase': 'Test SDF Future Network ; October 2022',
          'app.stellar.network': 'testnet',
        };
        return values[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        SubmitQueue,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('queryContract', () => {
    beforeEach(() => {
      const horizonServer = SDK_MOCK.__mocks.horizonServer;
      (
        horizonServer.accounts().accountId(SOURCE_ADDRESS).call as jest.Mock
      ).mockResolvedValue({ sequence: '1' });
    });

    it('should return the parsed return value from a successful simulation', async () => {
      const rpcServer = SDK_MOCK.__mocks.rpcServer;
      rpcServer.simulateTransaction.mockResolvedValue({
        transactionData: new SorobanDataBuilder().build(),
        minResourceFee: '100',
        result: { auth: [], retval: nativeToScVal(42) },
      });

      const result = await service.queryContract(
        CONTRACT_ID,
        'get_did',
        ['some-did'],
        SOURCE_ADDRESS,
      );

      expect(result).toBe(42n);
      expect(rpcServer.simulateTransaction).toHaveBeenCalledTimes(1);
      const [tx] = rpcServer.simulateTransaction.mock.calls[0];
      expect(tx.source).toBe(SOURCE_ADDRESS);
    });

    it('should re-simulate with the footprint when the first pass has no result', async () => {
      const rpcServer = SDK_MOCK.__mocks.rpcServer;
      rpcServer.simulateTransaction
        .mockResolvedValueOnce({
          transactionData: new SorobanDataBuilder(),
          minResourceFee: '100',
        })
        .mockResolvedValueOnce({
          transactionData: new SorobanDataBuilder(),
          minResourceFee: '100',
          result: { auth: [], retval: nativeToScVal(7) },
        });

      const result = await service.queryContract(
        CONTRACT_ID,
        'get_did',
        [],
        SOURCE_ADDRESS,
      );

      expect(result).toBe(7n);
      expect(rpcServer.simulateTransaction).toHaveBeenCalledTimes(2);
    });

    it('should throw a readable error when the simulation fails', async () => {
      const rpcServer = SDK_MOCK.__mocks.rpcServer;
      rpcServer.simulateTransaction.mockResolvedValue({ error: 'boom' });

      await expect(
        service.queryContract(CONTRACT_ID, 'get_did', [], SOURCE_ADDRESS),
      ).rejects.toThrow(/boom/);
    });

    it('should throw when no sourceAddress is provided', async () => {
      await expect(
        service.queryContract(CONTRACT_ID, 'get_did', []),
      ).rejects.toThrow(/sourceAddress/);
    });
  });

  describe('getAccountBalance', () => {
    it('should return the native balance', async () => {
      const horizonServer = SDK_MOCK.__mocks.horizonServer;
      (
        horizonServer.accounts().accountId(SOURCE_ADDRESS).call as jest.Mock
      ).mockResolvedValue({
        balances: [{ asset_type: 'native', balance: '9999.9999900' }],
      });

      const result = await service.getAccountBalance(SOURCE_ADDRESS);

      expect(result).toBe('9999.9999900');
      expect(horizonServer.accounts).toHaveBeenCalledWith();
    });

    it('should throw when the account has no native balance', async () => {
      const horizonServer = SDK_MOCK.__mocks.horizonServer;
      (
        horizonServer.accounts().accountId(SOURCE_ADDRESS).call as jest.Mock
      ).mockResolvedValue({
        balances: [{ asset_type: 'credit_alphanum4', balance: '10' }],
      });

      await expect(service.getAccountBalance(SOURCE_ADDRESS)).rejects.toThrow(
        /no native balance/,
      );
    });
  });

  describe('buildInvokeContractTx', () => {
    it('should build, prepare, and return an unsigned transaction', async () => {
      const rpcServer = SDK_MOCK.__mocks.rpcServer;
      const horizonServer = SDK_MOCK.__mocks.horizonServer;
      (
        horizonServer.accounts().accountId(SOURCE_ADDRESS).call as jest.Mock
      ).mockResolvedValue({ sequence: '42' });

      const source = new Account(SOURCE_ADDRESS, '42');
      const expected = new TransactionBuilder(source, {
        fee: '100',
        networkPassphrase: 'Test SDF Future Network ; October 2022',
      })
        .addOperation(
          Operation.invokeContractFunction({
            contract: CONTRACT_ID,
            function: 'create_did',
            args: [nativeToScVal('did-123')],
          }),
        )
        .setTimeout(0)
        .build();
      rpcServer.prepareTransaction.mockResolvedValue(expected);

      const prepared = await service.buildInvokeContractTx(
        SOURCE_ADDRESS,
        CONTRACT_ID,
        'create_did',
        ['did-123'],
      );

      expect(prepared).toBe(expected);
      expect(rpcServer.prepareTransaction).toHaveBeenCalledTimes(1);
      const [tx] = rpcServer.prepareTransaction.mock.calls[0];
      expect(tx.source).toBe(SOURCE_ADDRESS);
    });
  });

  describe('submitTransaction', () => {
    it('should sign with every signer and return the finalized transaction', async () => {
      const rpcServer = SDK_MOCK.__mocks.rpcServer;
      const keypair = Keypair.random();
      const signerTwo = Keypair.random();
      const tx = new TransactionBuilder(new Account(keypair.publicKey(), '1'), {
        fee: '100',
        networkPassphrase: 'Test SDF Future Network ; October 2022',
      })
        .addOperation(
          Operation.invokeContractFunction({
            contract: CONTRACT_ID,
            function: 'set_verification',
            args: [nativeToScVal(true)],
          }),
        )
        .setTimeout(0)
        .build();

      rpcServer.sendTransaction.mockResolvedValue({
        status: 'PENDING',
        hash: 'abc123',
      });
      rpcServer.getTransaction.mockResolvedValue({
        status: 'SUCCESS',
        txHash: 'abc123',
      });

      const result = await service.submitTransaction(tx, [keypair, signerTwo]);

      expect(result).toEqual({ status: 'SUCCESS', txHash: 'abc123' });
      expect(rpcServer.sendTransaction).toHaveBeenCalledWith(tx);
      expect(rpcServer.getTransaction).toHaveBeenCalledWith('abc123');
      expect(tx.signatures.length).toBeGreaterThan(0);
    });

    it('should throw when the network rejects the transaction', async () => {
      const rpcServer = SDK_MOCK.__mocks.rpcServer;
      const keypair = Keypair.random();
      const tx = new TransactionBuilder(new Account(keypair.publicKey(), '1'), {
        fee: '100',
        networkPassphrase: 'Test SDF Future Network ; October 2022',
      })
        .addOperation(
          Operation.invokeContractFunction({
            contract: CONTRACT_ID,
            function: 'set_verification',
            args: [nativeToScVal(true)],
          }),
        )
        .setTimeout(0)
        .build();

      rpcServer.sendTransaction.mockResolvedValue({
        status: 'ERROR',
        hash: 'abc123',
      });

      await expect(service.submitTransaction(tx, [keypair])).rejects.toThrow(
        /rejected/,
      );
    });

    it('should throw when the transaction fails on chain', async () => {
      const rpcServer = SDK_MOCK.__mocks.rpcServer;
      const keypair = Keypair.random();
      const tx = new TransactionBuilder(new Account(keypair.publicKey(), '1'), {
        fee: '100',
        networkPassphrase: 'Test SDF Future Network ; October 2022',
      })
        .addOperation(
          Operation.invokeContractFunction({
            contract: CONTRACT_ID,
            function: 'set_verification',
            args: [nativeToScVal(true)],
          }),
        )
        .setTimeout(0)
        .build();

      rpcServer.sendTransaction.mockResolvedValue({
        status: 'PENDING',
        hash: 'abc123',
      });
      rpcServer.getTransaction.mockResolvedValue({
        status: 'FAILED',
        txHash: 'abc123',
      });

      await expect(service.submitTransaction(tx, [keypair])).rejects.toThrow(
        /failed on chain/,
      );
    });

    it('should time out while polling a never-finalizing transaction', async () => {
      jest
        .spyOn(StellarService.prototype as any, 'sleep')
        .mockResolvedValue(undefined);
      const rpcServer = SDK_MOCK.__mocks.rpcServer;
      const keypair = Keypair.random();
      const tx = new TransactionBuilder(new Account(keypair.publicKey(), '1'), {
        fee: '100',
        networkPassphrase: 'Test SDF Future Network ; October 2022',
      })
        .addOperation(
          Operation.invokeContractFunction({
            contract: CONTRACT_ID,
            function: 'set_verification',
            args: [nativeToScVal(true)],
          }),
        )
        .setTimeout(0)
        .build();

      rpcServer.sendTransaction.mockResolvedValue({
        status: 'PENDING',
        hash: 'abc123',
      });
      rpcServer.getTransaction.mockResolvedValue({
        status: 'NOT_FOUND',
        txHash: 'abc123',
      });

      await expect(service.submitTransaction(tx, [keypair])).rejects.toThrow(
        /Timed out/,
      );
    });
  });

  describe('submitContractTransaction', () => {
    const BAD_SEQ_RESULT_XDR = 'AAAAAAAAAAD////7AAAAAA==';
    const badSeqResult = xdr.TransactionResult.fromXDR(
      Buffer.from(BAD_SEQ_RESULT_XDR, 'base64'),
    );

    function buildInvokeTx(): Transaction {
      return new TransactionBuilder(new Account(SOURCE_ADDRESS, '1'), {
        fee: '100',
        networkPassphrase: 'Test SDF Future Network ; October 2022',
      })
        .addOperation(
          Operation.invokeContractFunction({
            contract: CONTRACT_ID,
            function: 'create_did',
            args: [nativeToScVal('owner-address')],
          }),
        )
        .setTimeout(0)
        .build();
    }

    beforeEach(() => {
      const horizonServer = SDK_MOCK.__mocks.horizonServer;
      (
        horizonServer.accounts().accountId(SOURCE_ADDRESS).call as jest.Mock
      ).mockResolvedValue({ sequence: '7' });
      const rpcServer = SDK_MOCK.__mocks.rpcServer;
      rpcServer.prepareTransaction.mockImplementation(
        async (tx: Transaction) => tx,
      );
    });

    it('should rebuild with a fresh sequence, re-simulate, sign, and return the finalized transaction', async () => {
      const rpcServer = SDK_MOCK.__mocks.rpcServer;
      rpcServer.sendTransaction.mockResolvedValue({
        status: 'PENDING',
        hash: 'hash-1',
      });
      rpcServer.getTransaction.mockResolvedValue({
        status: 'SUCCESS',
        txHash: 'hash-1',
      });

      const keypair = Keypair.random();
      const result = await service.submitContractTransaction({
        transaction: buildInvokeTx(),
        sourceAddress: SOURCE_ADDRESS,
        signers: [keypair],
      });

      expect(result).toEqual({ status: 'SUCCESS', txHash: 'hash-1' });
      const [refreshed] = rpcServer.prepareTransaction.mock.calls[0];
      expect(refreshed.source).toBe(SOURCE_ADDRESS);
      expect(refreshed.sequence).toBe('8');
      expect(rpcServer.sendTransaction).toHaveBeenCalledTimes(1);
      expect(rpcServer.getTransaction).toHaveBeenCalledTimes(1);
    });

    it('should retry with a fresh sequence on tx_bad_seq and succeed', async () => {
      const rpcServer = SDK_MOCK.__mocks.rpcServer;
      rpcServer.sendTransaction
        .mockResolvedValueOnce({
          status: 'ERROR',
          hash: 'hash-1',
          errorResult: badSeqResult,
        })
        .mockResolvedValueOnce({ status: 'PENDING', hash: 'hash-2' });
      rpcServer.getTransaction.mockResolvedValue({
        status: 'SUCCESS',
        txHash: 'hash-2',
      });

      const result = await service.submitContractTransaction({
        transaction: buildInvokeTx(),
        sourceAddress: SOURCE_ADDRESS,
        signers: [Keypair.random()],
      });

      expect(result).toEqual({ status: 'SUCCESS', txHash: 'hash-2' });
      expect(rpcServer.sendTransaction).toHaveBeenCalledTimes(2);
      expect(rpcServer.prepareTransaction).toHaveBeenCalledTimes(2);
      const horizonServer = SDK_MOCK.__mocks.horizonServer;
      const accountCall = horizonServer.accounts().accountId(SOURCE_ADDRESS)
        .call as jest.Mock;
      expect(accountCall).toHaveBeenCalledTimes(2);
    });

    it('should retry when the finalized transaction reports tx_bad_seq on chain', async () => {
      const rpcServer = SDK_MOCK.__mocks.rpcServer;
      rpcServer.sendTransaction
        .mockResolvedValueOnce({ status: 'PENDING', hash: 'hash-1' })
        .mockResolvedValueOnce({ status: 'PENDING', hash: 'hash-2' });
      rpcServer.getTransaction
        .mockResolvedValueOnce({
          status: 'FAILED',
          txHash: 'hash-1',
          resultXdr: badSeqResult,
        })
        .mockResolvedValueOnce({ status: 'SUCCESS', txHash: 'hash-2' });

      const result = await service.submitContractTransaction({
        transaction: buildInvokeTx(),
        sourceAddress: SOURCE_ADDRESS,
        signers: [Keypair.random()],
      });

      expect(result).toEqual({ status: 'SUCCESS', txHash: 'hash-2' });
      expect(rpcServer.sendTransaction).toHaveBeenCalledTimes(2);
    });

    it('should throw DidSubmissionContentionError when every retry collides', async () => {
      const rpcServer = SDK_MOCK.__mocks.rpcServer;
      rpcServer.sendTransaction.mockResolvedValue({
        status: 'ERROR',
        hash: 'hash-x',
        errorResult: badSeqResult,
      });

      await expect(
        service.submitContractTransaction({
          transaction: buildInvokeTx(),
          sourceAddress: SOURCE_ADDRESS,
          signers: [Keypair.random()],
        }),
      ).rejects.toThrow(DidSubmissionContentionError);

      expect(rpcServer.sendTransaction).toHaveBeenCalledTimes(3);
    });

    it('should surface DidPrepareExpiredError on a retry attempt instead of resubmitting stale entries', async () => {
      const rpcServer = SDK_MOCK.__mocks.rpcServer;
      rpcServer.sendTransaction.mockResolvedValue({
        status: 'ERROR',
        hash: 'hash-1',
        errorResult: badSeqResult,
      });
      const isValidBeforeSubmit = jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValue(new DidPrepareExpiredError());

      await expect(
        service.submitContractTransaction({
          transaction: buildInvokeTx(),
          sourceAddress: SOURCE_ADDRESS,
          signers: [Keypair.random()],
          isValidBeforeSubmit,
        }),
      ).rejects.toThrow(DidPrepareExpiredError);

      expect(rpcServer.sendTransaction).toHaveBeenCalledTimes(1);
      expect(rpcServer.prepareTransaction).toHaveBeenCalledTimes(1);
    });

    it('should not submit at all when the prepare has already expired', async () => {
      const rpcServer = SDK_MOCK.__mocks.rpcServer;
      const isValidBeforeSubmit = jest
        .fn()
        .mockRejectedValue(new DidPrepareExpiredError());

      await expect(
        service.submitContractTransaction({
          transaction: buildInvokeTx(),
          sourceAddress: SOURCE_ADDRESS,
          signers: [Keypair.random()],
          isValidBeforeSubmit,
        }),
      ).rejects.toThrow(DidPrepareExpiredError);

      expect(rpcServer.sendTransaction).not.toHaveBeenCalled();
      expect(rpcServer.prepareTransaction).not.toHaveBeenCalled();
    });
  });

  describe('watchEvents', () => {
    it('should remain a placeholder until the indexer slice', async () => {
      await expect(service.watchEvents('1')).rejects.toThrow(
        /not yet implemented/,
      );
    });
  });

  describe('argument encoding', () => {
    it('should round-trip scalar arguments through the SDK scVal helpers', () => {
      expect(scValToNative(nativeToScVal(42))).toBe(42n);
      expect(scValToNative(nativeToScVal('did-123'))).toBe('did-123');
      expect(scValToNative(nativeToScVal(true))).toBe(true);
    });
  });
});
