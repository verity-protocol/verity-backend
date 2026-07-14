import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Logger,
} from '@nestjs/common';
import { DidService } from './did.service';

/**
 * DID API — manages Decentralized Identifiers on Stellar.
 *
 * The DID is the user's permanent identity on Verity. It is NOT a wallet.
 * It is a separate on-chain record that can have one or more wallet addresses
 * linked to it. If a wallet is lost, the user links a new wallet to their
 * existing DID — identity is never lost.
 *
 * This is the core module — all other modules depend on it.
 */
@Controller('did')
export class DidController {
  private readonly logger = new Logger(DidController.name);

  constructor(private readonly didService: DidService) {}

  /**
   * Create a new DID for a wallet address.
   *
   * TODO: Implement
   * - Validate wallet address format (Stellar G... address)
   * - Check wallet doesn't already have a DID
   * - Call StellarService to write DID record to did_registry contract
   * - Store Did record in database with owner = wallet address
   * - Link the wallet as primary
   * - If nullifierHash provided, store nullifier for Sybil resistance
   * - Return the DID document
   */
  @Post()
  async createDid(
    @Body() _body: { ownerAddress: string; nullifierHash?: string },
  ) {
    this.logger.warn('createDid not yet implemented');
    return { message: 'TODO: Create DID — see did.service.ts' };
  }

  /**
   * Resolve a DID to its verification status and linked wallets.
   *
   * THIS IS THE REFERENCE IMPLEMENTATION — demonstrates the full
   * NestJS → TypeORM → StellarService pattern.
   *
   * Flow:
   * 1. Controller validates the identifier parameter
   * 2. Service queries TypeORM for the Did record + relations
   * 3. Service calls StellarService to get on-chain verification status
   * 4. Returns formatted DID resolution document
   */
  @Get(':identifier')
  async resolveDid(@Param('identifier') identifier: string) {
    return this.didService.resolve(identifier);
  }

  /**
   * List all wallets linked to a DID.
   *
   * TODO: Implement
   * - Look up DID by address
   * - Return all linked wallets with isPrimary flag
   */
  @Get(':identifier/wallets')
  async listWallets(@Param('identifier') _identifier: string) {
    this.logger.warn('listWallets not yet implemented');
    return { message: 'TODO: List wallets — see did.service.ts' };
  }

  /**
   * Link a new wallet to a DID.
   *
   * TODO: Implement
   * - Validate caller is the DID owner (require_auth equivalent)
   * - Validate new wallet address format
   * - Check wallet isn't already linked
   * - Call StellarService to write wallet link to did_registry contract
   * - Store Wallet record in database
   */
  @Post(':identifier/wallets')
  async linkWallet(
    @Param('identifier') _identifier: string,
    @Body() _body: { walletAddress: string },
  ) {
    this.logger.warn('linkWallet not yet implemented');
    return { message: 'TODO: Link wallet — see did.service.ts' };
  }

  /**
   * Remove a wallet from a DID.
   *
   * TODO: Implement
   * - Validate caller is the DID owner
   * - Check this isn't the last wallet
   * - Call StellarService to remove wallet from did_registry contract
   * - Delete Wallet record from database
   */
  @Delete(':identifier/wallets/:address')
  async unlinkWallet(
    @Param('identifier') _identifier: string,
    @Param('address') _address: string,
  ) {
    this.logger.warn('unlinkWallet not yet implemented');
    return { message: 'TODO: Unlink wallet — see did.service.ts' };
  }

  /**
   * Set verification status of a DID (admin-only).
   *
   * TODO: Implement
   * - Validate caller is admin
   * - Update Did.isVerified in database
   * - Update on-chain verification status via StellarService
   */
  @Patch(':identifier/verification')
  async setVerification(
    @Param('identifier') _identifier: string,
    @Body() _body: { isVerified: boolean },
  ) {
    this.logger.warn('setVerification not yet implemented');
    return { message: 'TODO: Set verification — see did.service.ts' };
  }
}
