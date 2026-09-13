import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Keypair } from '@stellar/stellar-sdk';
import { SigningKeysService } from './signing-keys.service';

describe('SigningKeysService', () => {
  function buildService(config: Record<string, unknown>): SigningKeysService {
    return new SigningKeysService({
      get: (key: string) => config[key],
    } as unknown as ConfigService);
  }

  it('should be defined', () => {
    expect(buildService({})).toBeDefined();
  });

  describe('getFeeSponsorKeypair', () => {
    it('should return a keypair when configured', () => {
      const secret = Keypair.random().secret();
      const service = buildService({
        'app.stellar.feeSponsorSecret': secret,
      });
      expect(service.getFeeSponsorKeypair().secret()).toBe(secret);
    });

    it('should throw ServiceUnavailableException when not configured', () => {
      const service = buildService({});
      expect(() => service.getFeeSponsorKeypair()).toThrow(
        ServiceUnavailableException,
      );
    });

    it('should cache the keypair across calls', () => {
      const service = buildService({
        'app.stellar.feeSponsorSecret': Keypair.random().secret(),
      });
      expect(service.getFeeSponsorKeypair()).toBe(
        service.getFeeSponsorKeypair(),
      );
    });
  });

  describe('getAdminKeypair', () => {
    it('should return a keypair when configured', () => {
      const secret = Keypair.random().secret();
      const service = buildService({
        'app.stellar.adminSecret': secret,
      });
      expect(service.getAdminKeypair().secret()).toBe(secret);
    });

    it('should throw ServiceUnavailableException when not configured', () => {
      const service = buildService({});
      expect(() => service.getAdminKeypair()).toThrow(
        ServiceUnavailableException,
      );
    });

    it('should cache the keypair across calls', () => {
      const service = buildService({
        'app.stellar.adminSecret': Keypair.random().secret(),
      });
      expect(service.getAdminKeypair()).toBe(service.getAdminKeypair());
    });
  });

  describe('getIssuerKeypair', () => {
    it('should return a keypair when configured', () => {
      const secret = Keypair.random().secret();
      const service = buildService({
        'app.stellar.issuerSecret': secret,
      });
      expect(service.getIssuerKeypair().secret()).toBe(secret);
    });

    it('should throw ServiceUnavailableException when not configured', () => {
      const service = buildService({});
      expect(() => service.getIssuerKeypair()).toThrow(
        ServiceUnavailableException,
      );
    });

    it('should cache the keypair across calls', () => {
      const service = buildService({
        'app.stellar.issuerSecret': Keypair.random().secret(),
      });
      expect(service.getIssuerKeypair()).toBe(service.getIssuerKeypair());
    });
  });

  describe('production boot guard', () => {
    it('should fail construction when a secret is missing in production', () => {
      expect(() => buildService({ 'app.nodeEnv': 'production' })).toThrow(
        /STELLAR_FEE_SPONSOR_SECRET/,
      );
      expect(() =>
        buildService({
          'app.nodeEnv': 'production',
          'app.stellar.feeSponsorSecret': Keypair.random().secret(),
        }),
      ).toThrow(/STELLAR_ADMIN_SECRET/);
      expect(() =>
        buildService({
          'app.nodeEnv': 'production',
          'app.stellar.feeSponsorSecret': Keypair.random().secret(),
          'app.stellar.adminSecret': Keypair.random().secret(),
        }),
      ).toThrow(/STELLAR_ISSUER_SECRET/);
    });

    it('should not throw in production when all secrets are present', () => {
      expect(() =>
        buildService({
          'app.nodeEnv': 'production',
          'app.stellar.feeSponsorSecret': Keypair.random().secret(),
          'app.stellar.adminSecret': Keypair.random().secret(),
          'app.stellar.issuerSecret': Keypair.random().secret(),
        }),
      ).not.toThrow();
    });
  });
});
