import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Logger,
} from '@nestjs/common';
import { IssuerService } from './issuer.service';

/**
 * Issuer API — manages the registry of approved KYC providers.
 *
 * Only issuers registered in this system can write credentials
 * to the Verity credential contract. This is a permissioned
 * registry controlled by the Verity admin.
 */
@Controller('issuers')
export class IssuerController {
  private readonly logger = new Logger(IssuerController.name);

  constructor(private readonly issuerService: IssuerService) {}

  /**
   * List all registered issuers.
   *
   * TODO: Implement — query all issuers from database
   */
  @Get()
  async listIssuers() {
    this.logger.warn('listIssuers not yet implemented');
    return { message: 'TODO: List issuers — see issuer.service.ts' };
  }

  /**
   * Register a new KYC provider as an approved issuer.
   *
   * TODO: Implement
   * - Validate Stellar address format
   * - Check not already registered
   * - Store in database and write to Stellar issuer_registry contract
   */
  @Post()
  async addIssuer(@Body() _body: { address: string; name: string }) {
    this.logger.warn('addIssuer not yet implemented');
    return { message: 'TODO: Add issuer — see issuer.service.ts' };
  }

  /**
   * Remove an issuer from the registry.
   *
   * TODO: Implement
   * - Remove from database
   * - Update Stellar issuer_registry contract
   * - Note: existing credentials remain valid
   */
  @Delete(':address')
  async removeIssuer(@Param('address') _address: string) {
    this.logger.warn('removeIssuer not yet implemented');
    return { message: 'TODO: Remove issuer — see issuer.service.ts' };
  }
}
