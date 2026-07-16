import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DidService } from './did.service';
import { Did } from './entities/did.entity';
import { Wallet } from './entities/wallet.entity';

describe('DidService', () => {
  let service: DidService;
  let didRepository: {
    findOne: jest.Mock;
  };
  let walletRepository: object;

  beforeEach(async () => {
    didRepository = { findOne: jest.fn() };
    walletRepository = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DidService,
        { provide: getRepositoryToken(Did), useValue: didRepository },
        { provide: getRepositoryToken(Wallet), useValue: walletRepository },
      ],
    }).compile();

    service = module.get<DidService>(DidService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolve', () => {
    it('should return a formatted DID resolution document', async () => {
      const mockDid = {
        address: 'GABC123',
        owner: 'GDEF456',
        isVerified: true,
        wallets: [{ address: 'GDEF456' }],
        credentials: [
          {
            credentialType: 'kyc_basic',
            issuer: { address: 'GISSUER789' },
            issuedAt: new Date('2026-01-01'),
            isRevoked: false,
          },
        ],
        createdAt: new Date('2026-01-01'),
      };
      didRepository.findOne.mockResolvedValue(mockDid);

      const result = await service.resolve('GABC123');

      expect(result).toEqual({
        did: 'GABC123',
        owner: 'GDEF456',
        isVerified: true,
        wallets: ['GDEF456'],
        credentials: [
          {
            type: 'kyc_basic',
            issuer: 'GISSUER789',
            issuedAt: new Date('2026-01-01'),
            isRevoked: false,
          },
        ],
        createdAt: new Date('2026-01-01'),
      });
    });

    it('should throw NotFoundException for unknown DID', async () => {
      didRepository.findOne.mockResolvedValue(null);

      await expect(service.resolve('UNKNOWN')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should filter out revoked credentials', async () => {
      const mockDid = {
        address: 'GABC123',
        owner: 'GDEF456',
        isVerified: false,
        wallets: [],
        credentials: [
          {
            credentialType: 'kyc_basic',
            issuer: { address: 'GISSUER' },
            issuedAt: new Date(),
            isRevoked: true,
          },
        ],
        createdAt: new Date(),
      };
      didRepository.findOne.mockResolvedValue(mockDid);

      const result = await service.resolve('GABC123');

      expect(result.credentials).toEqual([]);
    });
  });
});
