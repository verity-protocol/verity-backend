import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StellarService } from '../../src/modules/stellar/stellar.service';

const HORIZON_URL = process.env.STELLAR_HORIZON_URL;
const RPC_URL = process.env.STELLAR_RPC_URL;
const PASSPHRASE =
  process.env.STELLAR_PASSPHRASE ?? 'Standalone Network ; February 2017';
const DID_REGISTRY_CONTRACT = process.env.STELLAR_DID_REGISTRY_CONTRACT_ID;
const SOURCE = process.env.STELLAR_QUERY_SOURCE;

const configured =
  process.env.E2E_LOCAL === '1' &&
  !!HORIZON_URL &&
  !!RPC_URL &&
  !!DID_REGISTRY_CONTRACT &&
  !!SOURCE;

const run = configured ? it : it.skip;

describe('StellarService (local sandbox e2e)', () => {
  let service: StellarService;

  beforeAll(async () => {
    if (!configured) {
      return;
    }
    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          'app.stellar.horizonUrl': HORIZON_URL as string,
          'app.stellar.rpcUrl': RPC_URL as string,
          'app.stellar.passphrase': PASSPHRASE,
          'app.stellar.network': 'standalone',
        };
        return values[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
  });

  const zeroDID = new Uint8Array(32);

  run(
    'should return a non-zero native balance for a funded source account',
    async () => {
      const balance = await service.getAccountBalance(SOURCE as string);
      expect(Number(balance)).toBeGreaterThan(0);
    },
  );

  run(
    'should resolve an unknown DID to null against the deployed did_registry',
    async () => {
      const result = await service.queryContract(
        DID_REGISTRY_CONTRACT as string,
        'get_did',
        [zeroDID],
        SOURCE as string,
      );
      expect(result).toBeNull();
    },
  );

  run(
    'should build and prepare a read transaction against the deployed did_registry',
    async () => {
      const tx = await service.buildInvokeContractTx(
        SOURCE as string,
        DID_REGISTRY_CONTRACT as string,
        'get_did',
        [zeroDID],
      );
      expect(tx.source).toBe(SOURCE);
      expect(tx.operations).toHaveLength(1);
      expect((tx.operations[0] as any).func.functionName).toBe('get_did');
    },
  );

  if (!configured) {
    it('is skipped (set E2E_LOCAL=1 and run the env setup first)', () => {
      expect(true).toBe(true);
    });
  }
});
