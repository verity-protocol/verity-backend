import { Controller, Post, Get, Body, Param, Logger } from '@nestjs/common';
import { CredentialService } from './credential.service';

/**
 * Credential API — manages verified credential lifecycle.
 *
 * Credentials are issued by approved KYC providers (issuers) after
 * off-chain document verification. Only the credential hash is stored
 * on-chain and in this database — never the raw document.
 *
 * Endpoints:
 * - POST /credentials — Issue a new credential (issuer only)
 * - GET /credentials/:did — List all credentials for a DID
 * - GET /credentials/:did/:type — Get specific credential
 * - POST /credentials/:did/:type/revoke — Revoke a credential
 */
@Controller('credentials')
export class CredentialController {
  private readonly logger = new Logger(CredentialController.name);

  constructor(private readonly credentialService: CredentialService) {}

  /**
   * Issue a credential to a DID.
   *
   * TODO: Implement
   * - Validate issuer is registered and active
   * - Check credential doesn't already exist for this DID + type
   * - Store credential in database
   * - Write credential hash to Stellar credential contract via StellarService
   * - Return the issued credential
   */
  @Post()
  async issueCredential(
    @Body()
    _body: {
      didAddress: string;
      issuerAddress: string;
      credentialType: string;
      credentialHash: string;
    },
  ) {
    this.logger.warn('issueCredential not yet implemented');
    return { message: 'TODO: Issue credential — see credential.service.ts' };
  }

  /**
   * List all credentials for a DID.
   *
   * TODO: Implement
   * - Look up DID by address
   * - Query all credentials for that DID
   * - Include issuer info
   */
  @Get(':did')
  async listCredentials(@Param('did') _didAddress: string) {
    this.logger.warn('listCredentials not yet implemented');
    return { message: 'TODO: List credentials — see credential.service.ts' };
  }

  /**
   * Get a specific credential for a DID.
   *
   * TODO: Implement
   * - Query credential by DID + type
   * - Return 404 if not found
   */
  @Get(':did/:type')
  async getCredential(
    @Param('did') _didAddress: string,
    @Param('type') _credentialType: string,
  ) {
    this.logger.warn('getCredential not yet implemented');
    return { message: 'TODO: Get credential — see credential.service.ts' };
  }

  /**
   * Revoke a credential.
   *
   * TODO: Implement
   * - Validate issuer is the original issuer
   * - Set isRevoked = true, set revokedAt = now
   * - Update on-chain credential contract via StellarService
   */
  @Post(':did/:type/revoke')
  async revokeCredential(
    @Param('did') _didAddress: string,
    @Param('type') _credentialType: string,
    @Body() _body: { issuerAddress: string },
  ) {
    this.logger.warn('revokeCredential not yet implemented');
    return { message: 'TODO: Revoke credential — see credential.service.ts' };
  }
}
