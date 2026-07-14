import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Did } from '../../did/entities/did.entity';
import { Issuer } from '../../issuer/entities/issuer.entity';

@Entity('credentials')
export class Credential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'did_id', nullable: false })
  didId: string;

  @ManyToOne(() => Did, (did) => did.credentials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'did_id' })
  did: Did;

  @Column({ name: 'issuer_id', nullable: false })
  issuerId: string;

  @ManyToOne(() => Issuer, (issuer) => issuer.credentials, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'issuer_id' })
  issuer: Issuer;

  @Column({ name: 'credential_type', nullable: false })
  credentialType: string;

  @Column({ name: 'credential_hash', nullable: false })
  credentialHash: string;

  @Column({ name: 'is_revoked', default: false })
  isRevoked: boolean;

  @Column({ name: 'issued_at', default: () => 'CURRENT_TIMESTAMP' })
  issuedAt: Date;

  @Column({ name: 'revoked_at', nullable: true })
  revokedAt: Date | null;
}
