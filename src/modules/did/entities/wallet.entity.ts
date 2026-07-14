import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Did } from './did.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  address: string;

  @Column({ name: 'did_id', nullable: false })
  didId: string;

  @ManyToOne(() => Did, (did) => did.wallets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'did_id' })
  did: Did;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @Column({ name: 'linked_at', default: () => 'CURRENT_TIMESTAMP' })
  linkedAt: Date;
}
