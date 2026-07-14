import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
  private readonly kycApiUrl: string;
  private readonly kycApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.kycApiUrl = this.configService.get<string>('app.kyc.apiUrl') || '';
    this.kycApiKey = this.configService.get<string>('app.kyc.apiKey') || '';
    this.logger.log('KycService initialized');
  }

  /**
   * Submit a document to the external KYC provider.
   *
   * TODO: Implement:
   * 1. Generate a submission ID (UUID)
   * 2. Store submission record in memory or temporary cache
   * 3. Forward document to KYC provider API (POST to kycApiUrl)
   *    - Include the API key in Authorization header
   *    - Send document in the provider's expected format
   * 4. Return the submission ID for status polling
   *
   * IMPORTANT: The document is passed directly from request memory
   * to the KYC provider API call. It is NEVER written to disk,
   * database, or object storage at any point.
   *
   * Provider abstraction:
   * - Smile ID (Africa-focused): POST /v1/identification
   * - Persona: POST /inquiries
   * - The specific API call depends on the configured provider
   */
  async submitDocument(
    _didAddress: string,
    _documentType: string,
    _documentData: string,
  ): Promise<string> {
    this.logger.warn('KycService.submitDocument not yet implemented');
    throw new Error('Not implemented');
  }

  /**
   * Check the verification status with the KYC provider.
   *
   * TODO: Implement:
   * 1. Query the KYC provider API for submission status
   * 2. If verified: call CredentialService.issue() to write credential
   * 3. If rejected: update submission status
   * 4. Return current status
   *
   * This method is called by the status polling endpoint and
   * also by a cron job that checks pending submissions.
   */
  async checkStatus(
    _submissionId: string,
  ): Promise<{ status: string; message?: string }> {
    this.logger.warn('KycService.checkStatus not yet implemented');
    return { status: 'processing' };
  }
}
