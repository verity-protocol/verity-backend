import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Keypair } from '@stellar/stellar-sdk';

@Injectable()
export class SigningKeysService {
  private readonly logger = new Logger(SigningKeysService.name);
  private readonly nodeEnv: string;
  private feeSponsor?: Keypair;
  private admin?: Keypair;

  constructor(private readonly configService: ConfigService) {
    this.nodeEnv =
      this.configService.get<string>('app.nodeEnv') ?? 'development';
    if (this.nodeEnv === 'production') {
      const missing: string[] = [];
      if (!this.feeSponsorSecret) {
        missing.push('STELLAR_FEE_SPONSOR_SECRET');
      }
      if (!this.adminSecret) {
        missing.push('STELLAR_ADMIN_SECRET');
      }
      if (missing.length > 0) {
        throw new Error(
          `Boot failed: production requires ${missing.join(', ')} to be configured`,
        );
      }
    }
  }

  getFeeSponsorKeypair(): Keypair {
    if (!this.feeSponsor) {
      const secret = this.feeSponsorSecret;
      if (!secret) {
        this.logger.warn('STELLAR_FEE_SPONSOR_SECRET not configured');
        throw new ServiceUnavailableException(
          'DID registration is unavailable: fee sponsor not configured',
        );
      }
      this.feeSponsor = Keypair.fromSecret(secret);
    }
    return this.feeSponsor;
  }

  getAdminKeypair(): Keypair {
    if (!this.admin) {
      const secret = this.adminSecret;
      if (!secret) {
        this.logger.warn('STELLAR_ADMIN_SECRET not configured');
        throw new ServiceUnavailableException(
          'DID verification is unavailable: admin key not configured',
        );
      }
      this.admin = Keypair.fromSecret(secret);
    }
    return this.admin;
  }

  private get feeSponsorSecret(): string | undefined {
    return this.configService.get<string>('app.stellar.feeSponsorSecret');
  }

  private get adminSecret(): string | undefined {
    return this.configService.get<string>('app.stellar.adminSecret');
  }
}
