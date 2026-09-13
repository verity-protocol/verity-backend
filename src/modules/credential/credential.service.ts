import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from '@stellar/stellar-sdk';
import { StellarService } from '../stellar/stellar.service';
import { SigningKeysService } from '../stellar/signing-keys.service';
import { Credential } from './entities/credential.entity';
import { Did } from '../did/entities/did.entity';
import { Issuer } from '../issuer/entities/issuer.entity';
import {
  isValidStellarAddress,
  normalizeDidIdentifier,
  toCanonicalDid,
} from '../did/did-identifier';

export interface IssueCredentialInput {
  did: string;
  credentialType: string;
  credentialHash: string;
}

export interface RevokeCredentialInput {
  did: string;
  credentialType: string;
  issuerAddress: string;
}

const CREDENTIAL_TYPE_PATTERN = /^[a-zA-Z0-9_]+$/;
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

@Injectable()
export class CredentialService {
  private readonly logger = new Logger(CredentialService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly stellarService: StellarService,
    private readonly signingKeys: SigningKeysService,
    @InjectRepository(Credential)
    private readonly credentialRepository: Repository<Credential>,
    @InjectRepository(Did)
    private readonly didRepository: Repository<Did>,
    @InjectRepository(Issuer)
    private readonly issuerRepository: Repository<Issuer>,
  ) {}

  async issue(input: IssueCredentialInput): Promise<Credential> {
    const didHex = normalizeDidIdentifier(input.did);
    this.requireCredentialType(input.credentialType);
    this.requireCredentialHash(input.credentialHash);

    const issuer = this.signingKeys.getIssuerKeypair();
    const contractId = this.contractId();

    const didEntity = await this.didRepository.findOne({
      where: { address: didHex },
    });
    if (!didEntity) {
      throw new NotFoundException(`DID not found: ${toCanonicalDid(didHex)}`);
    }

    const issuerEntity = await this.issuerRepository.findOne({
      where: { address: issuer.publicKey() },
    });
    if (!issuerEntity || !issuerEntity.isActive) {
      throw new ForbiddenException(
        `Issuer is not approved: ${issuer.publicKey()}`,
      );
    }

    const existing = await this.credentialRepository.findOne({
      where: { didId: didEntity.id, credentialType: input.credentialType },
    });
    if (existing) {
      throw new ConflictException(
        `A ${input.credentialType} credential already exists for ${toCanonicalDid(didHex)}`,
      );
    }

    const prepared = await this.stellarService.prepareContractCall({
      sourceAddress: issuer.publicKey(),
      contractId,
      method: 'issue_credential',
      args: [
        new Address(issuer.publicKey()),
        Buffer.from(didHex, 'hex'),
        input.credentialType,
        Buffer.from(input.credentialHash, 'hex'),
      ],
    });
    await this.stellarService.submitContractTransaction({
      transaction: prepared.transaction,
      signers: [issuer],
      sourceAddress: issuer.publicKey(),
    });

    const credential = await this.credentialRepository.save(
      this.credentialRepository.create({
        didId: didEntity.id,
        issuerId: issuerEntity.id,
        credentialType: input.credentialType,
        credentialHash: input.credentialHash,
      }),
    );
    return credential;
  }

  async listByDid(did: string): Promise<Credential[]> {
    const didEntity = await this.requireDid(did);
    return this.credentialRepository.find({
      where: { didId: didEntity.id },
      relations: ['issuer'],
      order: { issuedAt: 'DESC' },
    });
  }

  async getByDidAndType(
    did: string,
    credentialType: string,
  ): Promise<Credential> {
    const didEntity = await this.requireDid(did);
    this.requireCredentialType(credentialType);
    const credential = await this.credentialRepository.findOne({
      where: { didId: didEntity.id, credentialType },
      relations: ['issuer'],
    });
    if (!credential) {
      throw new NotFoundException(
        `Credential not found: ${toCanonicalDid(didEntity.address)} type ${credentialType}`,
      );
    }
    return credential;
  }

  async revoke(input: RevokeCredentialInput): Promise<Credential> {
    const didHex = normalizeDidIdentifier(input.did);
    this.requireCredentialType(input.credentialType);
    if (!isValidStellarAddress(input.issuerAddress)) {
      throw new BadRequestException(
        `Invalid Stellar address: ${input.issuerAddress}`,
      );
    }

    const issuer = this.signingKeys.getIssuerKeypair();
    if (issuer.publicKey() !== input.issuerAddress) {
      throw new ForbiddenException(
        'Only the original issuer can revoke a credential',
      );
    }

    const didEntity = await this.didRepository.findOne({
      where: { address: didHex },
    });
    if (!didEntity) {
      throw new NotFoundException(`DID not found: ${toCanonicalDid(didHex)}`);
    }

    const credential = await this.credentialRepository.findOne({
      where: { didId: didEntity.id, credentialType: input.credentialType },
      relations: ['issuer'],
    });
    if (!credential) {
      throw new NotFoundException(
        `Credential not found: ${toCanonicalDid(didHex)} type ${input.credentialType}`,
      );
    }
    if (credential.issuer?.address !== issuer.publicKey()) {
      throw new ForbiddenException(
        'Only the original issuer can revoke a credential',
      );
    }
    if (credential.isRevoked) {
      throw new ConflictException(
        `Credential already revoked: ${toCanonicalDid(didHex)} type ${input.credentialType}`,
      );
    }

    const prepared = await this.stellarService.prepareContractCall({
      sourceAddress: issuer.publicKey(),
      contractId: this.contractId(),
      method: 'revoke_credential',
      args: [
        new Address(issuer.publicKey()),
        Buffer.from(didHex, 'hex'),
        input.credentialType,
      ],
    });
    await this.stellarService.submitContractTransaction({
      transaction: prepared.transaction,
      signers: [issuer],
      sourceAddress: issuer.publicKey(),
    });

    credential.isRevoked = true;
    credential.revokedAt = new Date();
    return this.credentialRepository.save(credential);
  }

  private async requireDid(did: string): Promise<Did> {
    const didHex = normalizeDidIdentifier(did);
    const didEntity = await this.didRepository.findOne({
      where: { address: didHex },
    });
    if (!didEntity) {
      throw new NotFoundException(`DID not found: ${toCanonicalDid(didHex)}`);
    }
    return didEntity;
  }

  private requireCredentialType(credentialType: string): void {
    if (!CREDENTIAL_TYPE_PATTERN.test(credentialType)) {
      throw new BadRequestException(
        `Credential type must match ${CREDENTIAL_TYPE_PATTERN}: ${credentialType}`,
      );
    }
  }

  private requireCredentialHash(credentialHash: string): void {
    if (!SHA256_HEX_PATTERN.test(credentialHash)) {
      throw new BadRequestException(
        'Credential hash must be a 64-character lowercase SHA-256 hex digest',
      );
    }
  }

  private contractId(): string {
    const contractId = this.configService.get<string>(
      'app.stellar.credentialRegistryContractId',
    );
    if (!contractId) {
      throw new ServiceUnavailableException(
        'Credential operations are unavailable: STELLAR_CONTRACT_CREDENTIAL_REGISTRY is not configured',
      );
    }
    return contractId;
  }
}
