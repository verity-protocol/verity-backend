import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Keypair } from '@stellar/stellar-sdk';
import { CredentialService } from './credential.service';
import { Credential } from './entities/credential.entity';
import { Did } from '../did/entities/did.entity';
import { Issuer } from '../issuer/entities/issuer.entity';
import { StellarService } from '../stellar/stellar.service';
import { SigningKeysService } from '../stellar/signing-keys.service';
import { InvalidDidFormatError } from '../did/did-identifier';

describe('CredentialService', () => {
  const HEX = 'b'.repeat(64);
  const DID = `did:verity:${HEX}`;
  const HASH = 'c'.repeat(64);
  const TYPE = 'kyc_basic';

  let service: CredentialService;
  let issuerPair: Keypair;
  let credentialRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let didRepository: { findOne: jest.Mock };
  let issuerRepository: { findOne: jest.Mock };
  let stellarService: {
    prepareContractCall: jest.Mock;
    submitContractTransaction: jest.Mock;
  };
  let signingKeys: { getIssuerKeypair: jest.Mock };

  beforeEach(async () => {
    issuerPair = Keypair.random();
    credentialRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((input: object) => input),
    };
    didRepository = { findOne: jest.fn() };
    issuerRepository = { findOne: jest.fn() };
    stellarService = {
      prepareContractCall: jest.fn().mockResolvedValue({ transaction: {} }),
      submitContractTransaction: jest.fn().mockResolvedValue({}),
    };
    signingKeys = { getIssuerKeypair: jest.fn().mockReturnValue(issuerPair) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('CCREDENTIALS'),
          },
        },
        { provide: StellarService, useValue: stellarService },
        { provide: SigningKeysService, useValue: signingKeys },
        {
          provide: getRepositoryToken(Credential),
          useValue: credentialRepository,
        },
        { provide: getRepositoryToken(Did), useValue: didRepository },
        { provide: getRepositoryToken(Issuer), useValue: issuerRepository },
      ],
    }).compile();

    service = module.get<CredentialService>(CredentialService);
  });

  describe('issue', () => {
    it('should issue a credential against the contract and database', async () => {
      didRepository.findOne.mockResolvedValue({ id: 'did-uuid', address: HEX });
      issuerRepository.findOne.mockResolvedValue({
        id: 'issuer-uuid',
        address: issuerPair.publicKey(),
        isActive: true,
      });
      credentialRepository.findOne.mockResolvedValue(null);
      credentialRepository.save.mockResolvedValue({
        id: 'cred-uuid',
        didId: 'did-uuid',
        issuerId: 'issuer-uuid',
        credentialType: TYPE,
        credentialHash: HASH,
      });

      const result = await service.issue({
        did: DID,
        credentialType: TYPE,
        credentialHash: HASH,
      });

      expect(stellarService.prepareContractCall).toHaveBeenCalledWith({
        sourceAddress: issuerPair.publicKey(),
        contractId: 'CCREDENTIALS',
        method: 'issue_credential',
        args: [expect.anything(), expect.anything(), TYPE, expect.anything()],
      });
      expect(stellarService.submitContractTransaction).toHaveBeenCalledWith({
        transaction: {},
        signers: [issuerPair],
        sourceAddress: issuerPair.publicKey(),
      });
      expect(credentialRepository.create).toHaveBeenCalledWith({
        didId: 'did-uuid',
        issuerId: 'issuer-uuid',
        credentialType: TYPE,
        credentialHash: HASH,
      });
      expect(result.id).toBe('cred-uuid');
    });

    it('should reject an invalid DID identifier', async () => {
      await expect(
        service.issue({
          did: 'not-a-did',
          credentialType: TYPE,
          credentialHash: HASH,
        }),
      ).rejects.toThrow(InvalidDidFormatError);
    });

    it('should reject an invalid credential type', async () => {
      await expect(
        service.issue({
          did: DID,
          credentialType: 'bad type!',
          credentialHash: HASH,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a malformed credential hash', async () => {
      await expect(
        service.issue({
          did: DID,
          credentialType: TYPE,
          credentialHash: 'zzz',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when the DID does not exist', async () => {
      didRepository.findOne.mockResolvedValue(null);

      await expect(
        service.issue({ did: DID, credentialType: TYPE, credentialHash: HASH }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when the issuer is not approved', async () => {
      didRepository.findOne.mockResolvedValue({ id: 'did-uuid', address: HEX });
      issuerRepository.findOne.mockResolvedValue(null);

      await expect(
        service.issue({ did: DID, credentialType: TYPE, credentialHash: HASH }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when a credential of the type exists', async () => {
      didRepository.findOne.mockResolvedValue({ id: 'did-uuid', address: HEX });
      issuerRepository.findOne.mockResolvedValue({
        id: 'issuer-uuid',
        address: issuerPair.publicKey(),
        isActive: true,
      });
      credentialRepository.findOne.mockResolvedValue({
        id: 'existing',
        credentialType: TYPE,
      });

      await expect(
        service.issue({ did: DID, credentialType: TYPE, credentialHash: HASH }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('listByDid', () => {
    it('should throw NotFoundException for an unknown DID', async () => {
      didRepository.findOne.mockResolvedValue(null);

      await expect(service.listByDid(DID)).rejects.toThrow(NotFoundException);
    });

    it('should list credentials ordered by issuedAt desc', async () => {
      didRepository.findOne.mockResolvedValue({ id: 'did-uuid', address: HEX });
      credentialRepository.find.mockResolvedValue([{ credentialType: TYPE }]);

      const result = await service.listByDid(DID);

      expect(credentialRepository.find).toHaveBeenCalledWith({
        where: { didId: 'did-uuid' },
        relations: ['issuer'],
        order: { issuedAt: 'DESC' },
      });
      expect(result).toEqual([{ credentialType: TYPE }]);
    });
  });

  describe('getByDidAndType', () => {
    it('should return a matching credential', async () => {
      didRepository.findOne.mockResolvedValue({ id: 'did-uuid', address: HEX });
      credentialRepository.findOne.mockResolvedValue({
        id: 'cred-uuid',
        credentialType: TYPE,
      });

      const result = await service.getByDidAndType(DID, TYPE);

      expect(credentialRepository.findOne).toHaveBeenCalledWith({
        where: { didId: 'did-uuid', credentialType: TYPE },
        relations: ['issuer'],
      });
      expect(result.credentialType).toBe(TYPE);
    });

    it('should throw NotFoundException when missing', async () => {
      didRepository.findOne.mockResolvedValue({ id: 'did-uuid', address: HEX });
      credentialRepository.findOne.mockResolvedValue(null);

      await expect(service.getByDidAndType(DID, TYPE)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('revoke', () => {
    it('should revoke a credential on-chain and in the database', async () => {
      didRepository.findOne.mockResolvedValue({ id: 'did-uuid', address: HEX });
      credentialRepository.findOne.mockResolvedValue({
        id: 'cred-uuid',
        credentialType: TYPE,
        issuer: { address: issuerPair.publicKey() },
        isRevoked: false,
        revokedAt: null,
      });
      credentialRepository.save.mockResolvedValue({
        id: 'cred-uuid',
        credentialType: TYPE,
        isRevoked: true,
        revokedAt: expect.any(Date),
      });

      await service.revoke({
        did: DID,
        credentialType: TYPE,
        issuerAddress: issuerPair.publicKey(),
      });

      expect(stellarService.prepareContractCall).toHaveBeenCalledWith({
        sourceAddress: issuerPair.publicKey(),
        contractId: 'CCREDENTIALS',
        method: 'revoke_credential',
        args: [expect.anything(), expect.anything(), TYPE],
      });
      expect(stellarService.submitContractTransaction).toHaveBeenCalledWith({
        transaction: {},
        signers: [issuerPair],
        sourceAddress: issuerPair.publicKey(),
      });
      expect(credentialRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isRevoked: true }),
      );
    });

    it('should reject an invalid issuer address', async () => {
      await expect(
        service.revoke({
          did: DID,
          credentialType: TYPE,
          issuerAddress: 'nope',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a revoker that is not the configured issuer', async () => {
      const other = Keypair.random();
      await expect(
        service.revoke({
          did: DID,
          credentialType: TYPE,
          issuerAddress: other.publicKey(),
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when the credential is missing', async () => {
      didRepository.findOne.mockResolvedValue({ id: 'did-uuid', address: HEX });
      credentialRepository.findOne.mockResolvedValue(null);

      await expect(
        service.revoke({
          did: DID,
          credentialType: TYPE,
          issuerAddress: issuerPair.publicKey(),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject revoking an already revoked credential', async () => {
      didRepository.findOne.mockResolvedValue({ id: 'did-uuid', address: HEX });
      credentialRepository.findOne.mockResolvedValue({
        id: 'cred-uuid',
        issuer: { address: issuerPair.publicKey() },
        isRevoked: true,
      });

      await expect(
        service.revoke({
          did: DID,
          credentialType: TYPE,
          issuerAddress: issuerPair.publicKey(),
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
