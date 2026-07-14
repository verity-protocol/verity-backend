import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Issuer } from './entities/issuer.entity';

@Injectable()
export class IssuerService {
  private readonly logger = new Logger(IssuerService.name);

  constructor(
    @InjectRepository(Issuer)
    private readonly issuerRepository: Repository<Issuer>,
  ) {}

  /**
   * List all registered issuers.
   *
   * TODO: Implement:
   * 1. Query all issuers from database
   * 2. Return with credential counts
   */
  async listAll(): Promise<Issuer[]> {
    this.logger.warn('IssuerService.listAll not yet implemented');
    return [];
  }

  /**
   * Add a new approved issuer.
   *
   * TODO: Implement:
   * 1. Validate Stellar address format
   * 2. Check not already registered
   * 3. Save to database
   * 4. Call StellarService to write to issuer_registry contract
   */
  async add(_address: string, _name: string): Promise<Issuer> {
    this.logger.warn('IssuerService.add not yet implemented');
    throw new Error('Not implemented');
  }

  /**
   * Remove an issuer.
   *
   * TODO: Implement:
   * 1. Find issuer by address
   * 2. Remove from database
   * 3. Update Stellar issuer_registry contract
   */
  async remove(_address: string): Promise<void> {
    this.logger.warn('IssuerService.remove not yet implemented');
    throw new NotFoundException('Issuer not found');
  }

  /**
   * Check if an issuer is approved.
   *
   * TODO: Implement:
   * 1. Query issuer by address
   * 2. Return true if found and isActive
   */
  async isApproved(_address: string): Promise<boolean> {
    this.logger.warn('IssuerService.isApproved not yet implemented');
    return false;
  }
}
