import { Test, TestingModule } from '@nestjs/testing';
import { CredentialController } from './credential.controller';
import { CredentialService } from './credential.service';

describe('CredentialController', () => {
  let controller: CredentialController;
  let service: {
    issue: jest.Mock;
    listByDid: jest.Mock;
    getByDidAndType: jest.Mock;
    revoke: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      issue: jest.fn(),
      listByDid: jest.fn(),
      getByDidAndType: jest.fn(),
      revoke: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CredentialController],
      providers: [{ provide: CredentialService, useValue: service }],
    }).compile();

    controller = module.get<CredentialController>(CredentialController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('issueCredential should delegate to the service', async () => {
    const body = {
      did: 'did:verity:abc',
      credentialType: 'kyc_basic',
      credentialHash: 'c'.repeat(64),
    };
    service.issue.mockResolvedValue({ id: 'cred-uuid' });

    const result = await controller.issueCredential(body);

    expect(service.issue).toHaveBeenCalledWith(body);
    expect(result).toEqual({ id: 'cred-uuid' });
  });

  it('listCredentials should delegate to the service', async () => {
    service.listByDid.mockResolvedValue([{ credentialType: 'kyc_basic' }]);

    const result = await controller.listCredentials('did:verity:abc');

    expect(service.listByDid).toHaveBeenCalledWith('did:verity:abc');
    expect(result).toEqual([{ credentialType: 'kyc_basic' }]);
  });

  it('getCredential should delegate to the service', async () => {
    const result = await controller.getCredential(
      'did:verity:abc',
      'kyc_basic',
    );

    expect(service.getByDidAndType).toHaveBeenCalledWith(
      'did:verity:abc',
      'kyc_basic',
    );
    expect(result).toBeUndefined();
  });

  it('revokeCredential should delegate to the service', async () => {
    const result = await controller.revokeCredential(
      'did:verity:abc',
      'kyc_basic',
      {
        issuerAddress: 'GISSUER',
      },
    );

    expect(service.revoke).toHaveBeenCalledWith({
      did: 'did:verity:abc',
      credentialType: 'kyc_basic',
      issuerAddress: 'GISSUER',
    });
    expect(result).toBeUndefined();
  });
});
