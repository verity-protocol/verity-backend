import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Wallet } from './wallet.entity';
import { Credential } from '../../credential/entities/credential.entity';
import { AuthorizationSession } from '../../auth/entities/authorization-session.entity';
import { ConnectedApp } from './connected-app.entity';

@Entity('did')
export class Did {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Stellar address (G... public key)',
    example: 'GABC123...',
  })
  @Column({ unique: true, nullable: false })
  address: string;

  @ApiProperty({ description: 'Owner wallet address' })
  @Column({ nullable: false })
  owner: string;

  @ApiProperty({
    description: 'Whether this DID has been verified by an issuer',
  })
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

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
