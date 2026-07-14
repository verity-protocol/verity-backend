import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Did } from './entities/did.entity';
import { Wallet } from './entities/wallet.entity';

/**
 * DID Service — the core service for Verity identity management.
 *
 * This service is fully implemented for the `resolve()` method as a
 * reference pattern for contributors. All other methods are stubs
 * with TODO comments explaining the implementation intent.
 *
 * Pattern: Controller → Service → TypeORM + StellarService
 */
@Injectable()
export class DidService {
  private readonly logger = new Logger(DidService.name);

  constructor(
    @InjectRepository(Did)
    private readonly didRepository: Repository<Did>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) {}

  /**
   * Resolve a DID to its full verification document.
   *
   * This is the reference implementation — demonstrates the complete
   * NestJS → TypeORM → StellarService pattern.
   *
   * Flow:
   * 1. Query the `did` table by address
   * 2. If not found, throw NotFoundException (404)
   * 3. Load linked wallets via relation
   * 4. Load non-revoked credentials via relation
   * 5. Return formatted DID resolution document
   *
   * Note: In a full implementation, step 4 would also call
   * StellarService.queryContract() to verify on-chain status.
   * For now, we only read from the local database.
   */
  async resolve(identifier: string): Promise<{
    did: string;
    owner: string;
    isVerified: boolean;
    wallets: string[];
    credentials: Array<{
      type: string;
      issuer: string;
      issuedAt: Date;
      isRevoked: boolean;
    }>;
    createdAt: Date;
  }> {
    const did = await this.didRepository.findOne({
      where: { address: identifier },
      relations: ['wallets', 'credentials', 'credentials.issuer'],
    });

    if (!did) {
      throw new NotFoundException(`DID not found: ${identifier}`);
    }

    // Filter to non-revoked credentials only
    const activeCredentials = (did.credentials || [])
      .filter((c) => !c.isRevoked)
      .map((c) => ({
        type: c.credentialType,
        issuer: c.issuer?.address || 'unknown',
        issuedAt: c.issuedAt,
        isRevoked: c.isRevoked,
      }));

    const wallets = (did.wallets || []).map((w) => w.address);

    return {
      did: did.address,
      owner: did.owner,
      isVerified: did.isVerified,
      wallets,
      credentials: activeCredentials,
      createdAt: did.createdAt,
    };
  }

  /**
   * Create a new DID.
   *
   * TODO: Implement full flow:
   * 1. Validate ownerAddress is a valid Stellar G... address
   * 2. Check no DID exists with this owner already
   * 3. Call StellarService to write DID record to did_registry contract
   *    - Use StellarService.buildInvokeContractTx() to build the transaction
   *    - Sign with the backend's signing key
   *    - Submit via StellarService.submitTransaction()
   * 4. Extract the DID address from the transaction result
   * 5. Store Did record in database: { address, owner: ownerAddress, isVerified: false }
   * 6. Create Wallet record: { address: ownerAddress, didId, isPrimary: true }
   * 7. If nullifierHash provided, store Nullifier record
   * 8. Return the created Did
   */
  async create(_ownerAddress: string, _nullifierHash?: string): Promise<Did> {
    this.logger.warn('DidService.create not yet implemented');
    throw new Error('Not implemented');
  }

  /**
   * Link a new wallet to a DID.
   *
   * TODO: Implement:
   * 1. Validate the DID exists
   * 2. Validate newWalletAddress is a valid Stellar address
   * 3. Check wallet isn't already linked to any DID
   * 4. Call StellarService to write wallet link to did_registry contract
   * 5. Create Wallet record in database
   * 6. Return the updated wallet list
   */
  async linkWallet(
    _didAddress: string,
    _newWalletAddress: string,
  ): Promise<Wallet> {
    this.logger.warn('DidService.linkWallet not yet implemented');
    throw new Error('Not implemented');
  }

  /**
   * Remove a wallet from a DID.
   *
   * TODO: Implement:
   * 1. Load DID with wallets
   * 2. Check wallet is linked to this DID
   * 3. Check this isn't the last wallet (DID must have ≥1)
   * 4. Call StellarService to remove wallet from did_registry contract
   * 5. Delete Wallet record from database
   */
  async unlinkWallet(
    _didAddress: string,
    _walletAddress: string,
  ): Promise<void> {
    this.logger.warn('DidService.unlinkWallet not yet implemented');
    throw new Error('Not implemented');
  }

  /**
   * Set verification status of a DID.
   *
   * TODO: Implement:
   * 1. Load Did by address
   * 2. Update isVerified field
   * 3. Save to database
   * 4. Call StellarService to update on-chain verification status
   */
  async setVerification(
    _didAddress: string,
    _isVerified: boolean,
  ): Promise<void> {
    this.logger.warn('DidService.setVerification not yet implemented');
    throw new Error('Not implemented');
  }

  /**
   * Find a DID by wallet address.
   *
   * TODO: Implement:
   * 1. Query Wallet table by address
   * 2. Load the related Did
   * 3. Return the Did or null
   */
  async findByWallet(_walletAddress: string): Promise<Did | null> {
    this.logger.warn('DidService.findByWallet not yet implemented');
    return null;
  }
}
