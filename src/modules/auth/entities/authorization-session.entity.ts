import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Did } from '../../did/entities/did.entity';

@Entity('authorization_sessions')
export class AuthorizationSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: false })
  token: string;

  @Column({ name: 'did_id', nullable: false })
  didId: string;

  @ManyToOne(() => Did, (did) => did.authorizationSessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'did_id' })
  did: Did;

  @Column({ name: 'app_name', nullable: false })
  appName: string;

  @Column({ name: 'app_url', nullable: false })
  appUrl: string;

  @Column({ nullable: false, default: 'pending' })
  status: string;

  @Column({ name: 'requested_claims', type: 'jsonb', nullable: false })
  requestedClaims: Record<string, unknown>;

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'expires_at', nullable: false })
  expiresAt: Date;

  @Column({ name: 'resolved_at', nullable: true })
  resolvedAt: Date | null;
}
