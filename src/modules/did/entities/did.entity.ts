import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Wallet } from './wallet.entity';
import { Credential } from '../../credential/entities/credential.entity';
import { AuthorizationSession } from '../../auth/entities/authorization-session.entity';
import { ConnectedApp } from './connected-app.entity';

@Entity('did')
export class Did {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: false })
  address: string;

  @Column({ nullable: false })
  owner: string;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @OneToMany(() => Wallet, (wallet) => wallet.did)
  wallets: Wallet[];

  @OneToMany(() => Credential, (credential) => credential.did)
  credentials: Credential[];

  @OneToMany(() => AuthorizationSession, (session) => session.did)
  authorizationSessions: AuthorizationSession[];

  @OneToMany(() => ConnectedApp, (app) => app.did)
  connectedApps: ConnectedApp[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
