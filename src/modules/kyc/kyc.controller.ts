import { Controller, Post, Get, Body, Param, Logger } from '@nestjs/common';
import { KycService } from './kyc.service';

/**
 * KYC API — handles document submission and verification.
 *
 * IMPORTANT: Documents are NEVER stored on disk or in any database.
 * They are received, passed to the external KYC provider API,
 * and permanently deleted the moment verification is confirmed.
 *
 * Flow:
 * 1. User uploads document via frontend → POST /kyc/submit
 * 2. Backend forwards to external KYC provider (Persona, Smile ID, etc.)
 * 3. Backend polls verification status
 * 4. On success: issues credential via CredentialService, deletes document
 * 5. Frontend polls GET /kyc/status/:submissionId for progress
 */
@Controller('kyc')
export class KycController {
  private readonly logger = new Logger(KycController.name);

  constructor(private readonly kycService: KycService) {}

  /**
   * Submit a document for KYC verification.
   *
   * TODO: Implement
   * - Accept document upload (multipart/form-data or base64)
   * - Forward to external KYC provider API (abstracted behind KycService)
   * - Return { submissionId, status: 'processing' }
   *
   * SECURITY: The document is held in memory only during this request.
   * It is passed directly to the KYC provider and never written to
   * any database, disk, or object storage.
   */
  @Post('submit')
  async submitDocument(
    @Body()
    _body: {
      didAddress: string;
      documentType: string;
      documentData: string; // base64-encoded document
    },
  ) {
    this.logger.warn('submitDocument not yet implemented');
    return { message: 'TODO: Submit document — see kyc.service.ts' };
  }

  /**
   * Check verification status (polled by frontend).
   *
   * TODO: Implement
   * - Look up submission by ID
   * - Return { status, progress?, message? }
   * - Statuses: 'processing', 'verified', 'rejected', 'error'
   */
  @Get('status/:submissionId')
  async getStatus(@Param('submissionId') _submissionId: string) {
    this.logger.warn('getStatus not yet implemented');
    return { message: 'TODO: Get verification status — see kyc.service.ts' };
  }
}
