import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CredentialService } from './credential.service';
import { IssueCredentialDto, RevokeCredentialDto } from './dto/credential.dto';

/**
 * Credential API — manages verified credential lifecycle.
 *
 * Credentials are issued by approved KYC providers (issuers) after
 * off-chain document verification. Only the credential hash is stored
 * on-chain and in this database — never the raw document.
 *
 * Issuance is single-step and signed by the backend's issuer key
 * (STELLAR_ISSUER_SECRET), whose public key must be an approved issuer in
 * the issuer_registry contract.
 *
 * Endpoints:
 * - POST /credentials — Issue a new credential (issuer only)
 * - GET /credentials/:did — List all credentials for a DID
 * - GET /credentials/:did/:type — Get specific credential
 * - POST /credentials/:did/:type/revoke — Revoke a credential (issuer only)
 */
@ApiTags('credentials')
@Controller('credentials')
export class CredentialController {
  constructor(private readonly credentialService: CredentialService) {}

  @Post()
  @ApiOperation({ summary: 'Issue a credential to a DID (issuer-signed)' })
  @ApiResponse({ status: 201, description: 'Credential issued successfully' })
  @ApiResponse({ status: 400, description: 'Invalid credential type or hash' })
  @ApiResponse({ status: 403, description: 'Issuer not approved' })
  @ApiResponse({ status: 404, description: 'DID not found' })
  @ApiResponse({
    status: 409,
    description: 'Credential of this type already exists',
  })
  @ApiResponse({ status: 422, description: 'Invalid DID identifier format' })
  async issueCredential(@Body() body: IssueCredentialDto) {
    return this.credentialService.issue(body);
  }

  @Get(':did')
  @ApiOperation({ summary: 'List all credentials for a DID' })
  @ApiResponse({
    status: 200,
    description: 'List of credentials with issuer info',
  })
  @ApiResponse({ status: 404, description: 'DID not found' })
  @ApiResponse({ status: 422, description: 'Invalid DID identifier format' })
  async listCredentials(@Param('did') did: string) {
    return this.credentialService.listByDid(did);
  }

  @Get(':did/:type')
  @ApiOperation({ summary: 'Get a specific credential for a DID' })
  @ApiResponse({ status: 200, description: 'Credential returned' })
  @ApiResponse({ status: 404, description: 'DID or credential not found' })
  @ApiResponse({ status: 422, description: 'Invalid DID identifier format' })
  async getCredential(@Param('did') did: string, @Param('type') type: string) {
    return this.credentialService.getByDidAndType(did, type);
  }

  @Post(':did/:type/revoke')
  @ApiOperation({ summary: 'Revoke a credential (original issuer only)' })
  @ApiResponse({ status: 201, description: 'Credential revoked' })
  @ApiResponse({ status: 400, description: 'Invalid issuer address' })
  @ApiResponse({
    status: 403,
    description: 'Only the original issuer can revoke',
  })
  @ApiResponse({ status: 404, description: 'DID or credential not found' })
  @ApiResponse({ status: 409, description: 'Credential already revoked' })
  @ApiResponse({ status: 422, description: 'Invalid DID identifier format' })
  async revokeCredential(
    @Param('did') did: string,
    @Param('type') type: string,
    @Body() body: RevokeCredentialDto,
  ) {
    return this.credentialService.revoke({
      did,
      credentialType: type,
      issuerAddress: body.issuerAddress,
    });
  }
}
