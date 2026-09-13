import { Test, TestingModule } from '@nestjs/testing';
import { DidController } from './did.controller';
import { DidService } from './did.service';

describe('DidController', () => {
  let controller: DidController;
  let service: {
    prepareCreate: jest.Mock;
    prepareLink: jest.Mock;
    prepareUnlink: jest.Mock;
    confirmCreate: jest.Mock;
    confirmLink: jest.Mock;
    confirmUnlink: jest.Mock;
    findByWallet: jest.Mock;
    resolve: jest.Mock;
    listWallets: jest.Mock;
    setVerification: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      prepareCreate: jest.fn(),
      prepareLink: jest.fn(),
      prepareUnlink: jest.fn(),
      confirmCreate: jest.fn(),
      confirmLink: jest.fn(),
      confirmUnlink: jest.fn(),
      findByWallet: jest.fn(),
      resolve: jest.fn(),
      listWallets: jest.fn(),
      setVerification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DidController],
      providers: [{ provide: DidService, useValue: service }],
    }).compile();

    controller = module.get<DidController>(DidController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('prepareCreate', () => {
    it('should delegate to didService.prepareCreate', async () => {
      const mockResult = {
        method: 'create_did',
        contractId: 'C...',
        txXdr: 'AAAA...',
        authExpirationLedgers: [1000],
      };
      service.prepareCreate.mockResolvedValue(mockResult);

      const result = await controller.prepareCreate({
        ownerAddress: 'GDEF456',
      });

      expect(service.prepareCreate).toHaveBeenCalledWith('GDEF456');
      expect(result).toEqual(mockResult);
    });
  });

  describe('confirmCreate', () => {
    it('should delegate to didService.confirmCreate', async () => {
      const mockResult = { did: 'did:verity:abc', owner: 'GDEF456' };
      service.confirmCreate.mockResolvedValue(mockResult);

      const result = await controller.confirmCreate({
        txXdr: 'AAAA...',
        nullifierHash: 'abc123',
      });

      expect(service.confirmCreate).toHaveBeenCalledWith({
        txXdr: 'AAAA...',
        nullifierHash: 'abc123',
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('prepareLink', () => {
    it('should delegate to didService.prepareLink', async () => {
      await controller.prepareLink({
        didIdentifier: 'did:verity:abc',
        walletAddress: 'GDEF456',
      });

      expect(service.prepareLink).toHaveBeenCalledWith(
        'did:verity:abc',
        'GDEF456',
      );
    });
  });

  describe('confirmLink', () => {
    it('should delegate to didService.confirmLink', async () => {
      service.confirmLink.mockResolvedValue({ did: 'did:verity:abc' });

      const result = await controller.confirmLink({ txXdr: 'AAAA...' });

      expect(service.confirmLink).toHaveBeenCalledWith({ txXdr: 'AAAA...' });
      expect(result).toEqual({ did: 'did:verity:abc' });
    });
  });

  describe('prepareUnlink', () => {
    it('should delegate to didService.prepareUnlink', async () => {
      await controller.prepareUnlink({
        didIdentifier: 'did:verity:abc',
        walletAddress: 'GDEF456',
        callerAddress: 'GCALLER78',
      });

      expect(service.prepareUnlink).toHaveBeenCalledWith(
        'did:verity:abc',
        'GDEF456',
        'GCALLER78',
      );
    });
  });

  describe('confirmUnlink', () => {
    it('should delegate to didService.confirmUnlink', async () => {
      await controller.confirmUnlink({ txXdr: 'AAAA...' });

      expect(service.confirmUnlink).toHaveBeenCalledWith({ txXdr: 'AAAA...' });
    });
  });

  describe('findByWallet', () => {
    it('should throw NotFoundException when no DID is mapped', async () => {
      service.findByWallet.mockResolvedValue(null);

      await expect(controller.findByWallet('GDEF456')).rejects.toThrow();
    });

    it('should return the DID record when found', async () => {
      const mockRecord = { address: 'abc', owner: 'GDEF456' };
      service.findByWallet.mockResolvedValue(mockRecord);

      const result = await controller.findByWallet('GDEF456');

      expect(service.findByWallet).toHaveBeenCalledWith('GDEF456');
      expect(result).toEqual(mockRecord);
    });
  });

  describe('resolveDid', () => {
    it('should call didService.resolve with the identifier', async () => {
      const mockResult = {
        did: 'did:verity:abc',
        owner: 'GDEF456',
        isVerified: true,
        wallets: ['GDEF456'],
        credentials: [],
        createdAt: new Date(),
      };
      service.resolve.mockResolvedValue(mockResult);

      const result = await controller.resolveDid('did:verity:abc');

      expect(service.resolve).toHaveBeenCalledWith('did:verity:abc');
      expect(result).toEqual(mockResult);
    });
  });

  describe('listWallets', () => {
    it('should delegate to didService.listWallets', async () => {
      await controller.listWallets('did:verity:abc');

      expect(service.listWallets).toHaveBeenCalledWith('did:verity:abc');
    });
  });

  describe('setVerification', () => {
    it('should delegate to didService.setVerification', async () => {
      await controller.setVerification('did:verity:abc', { isVerified: true });

      expect(service.setVerification).toHaveBeenCalledWith(
        'did:verity:abc',
        true,
      );
    });
  });
});
