import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Credential } from './entities/credential.entity';

@Injectable()
export class CredentialService {
  private readonly logger = new Logger(CredentialService.name);

  constructor(
    @InjectRepository(Credential)
    private readonly credentialRepository: Repository<Credential>,
  ) {}

  /**
   * Issue a new credential.
   *
   * TODO: Implement full flow:
   * 1. Validate issuer exists and is active in the Issuer registry
   * 2. Check no credential of this type already exists for this DID
   * 3. Create and save Credential record in database
   * 4. Call StellarService.queryContract() to verify the DID exists on-chain
   * 5. Call StellarService.submitTransaction() to write credential hash to
   *    the Stellar credential contract (via the backend's signing key)
   * 6. Return the issued credential
   *
   * IMPORTANT: The raw document is NEVER stored. Only the pre-computed
   * credentialHash (SHA-256 of the verified credential data) is stored.
   */
  async issue(
    _didAddress: string,
    _issuerAddress: string,
    _credentialType: string,
    _credentialHash: string,
  ): Promise<Credential> {
    this.logger.warn('CredentialService.issue not yet implemented');
    throw new Error('Not implemented');
  }

  /**
   * List all credentials for a DID address.
   *
   * TODO: Implement:
   * 1. Look up the DID by address
   * 2. Query all credentials with issuer relation loaded
   * 3. Return sorted by issuedAt descending
   */
  async listByDid(_didAddress: string): Promise<Credential[]> {
    this.logger.warn('CredentialService.listByDid not yet implemented');
    throw new Error('Not implemented');
  }

  /**
   * Get a specific credential by DID address and credential type.
   *
   * TODO: Implement:
   * 1. Query credential by DID + type
   * 2. Throw NotFoundException if not found
   */
  async getByDidAndType(
    _didAddress: string,
    _credentialType: string,
  ): Promise<Credential> {
    this.logger.warn('CredentialService.getByDidAndType not yet implemented');
    throw new NotFoundException('Credential not found');
  }

  /**
   * Revoke a credential.
   *
   * TODO: Implement:
   * 1. Load credential by DID + type
   * 2. Validate the revoker is the original issuer
   * 3. Set isRevoked = true, revokedAt = new Date()
   * 4. Save to database
   * 5. Call StellarService to update on-chain revocation status
   */
  async revoke(
    _didAddress: string,
    _credentialType: string,
    _issuerAddress: string,
  ): Promise<Credential> {
    this.logger.warn('CredentialService.revoke not yet implemented');
    throw new Error('Not implemented');
  }
}
