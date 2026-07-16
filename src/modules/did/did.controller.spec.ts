import { Test, TestingModule } from '@nestjs/testing';
import { DidController } from './did.controller';
import { DidService } from './did.service';

describe('DidController', () => {
  let controller: DidController;
  let service: {
    resolve: jest.Mock;
  };

  beforeEach(async () => {
    service = { resolve: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DidController],
      providers: [{ provide: DidService, useValue: service }],
    }).compile();

    controller = module.get<DidController>(DidController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('resolveDid', () => {
    it('should call didService.resolve with the identifier', async () => {
      const mockResult = {
        did: 'GABC123',
        owner: 'GDEF456',
        isVerified: true,
        wallets: ['GDEF456'],
        credentials: [],
        createdAt: new Date(),
      };
      service.resolve.mockResolvedValue(mockResult);

      const result = await controller.resolveDid('GABC123');

      expect(service.resolve).toHaveBeenCalledWith('GABC123');
      expect(result).toEqual(mockResult);
    });
  });

  describe('stub endpoints', () => {
    it('createDid should return TODO message', async () => {
      const result = await controller.createDid({
        ownerAddress: 'GDEF456',
      });
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('TODO');
    });

    it('listWallets should return TODO message', async () => {
      const result = await controller.listWallets('GABC123');
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('TODO');
    });
  });
});
