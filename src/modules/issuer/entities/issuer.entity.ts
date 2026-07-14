import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Credential } from '../../credential/entities/credential.entity';

@Entity('issuers')
export class Issuer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: false })
  address: string;

  @Column({ nullable: false })
  name: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Credential, (credential) => credential.issuer)
  credentials: Credential[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
