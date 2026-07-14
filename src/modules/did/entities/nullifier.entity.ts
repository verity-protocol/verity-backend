import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Did } from './did.entity';

@Entity('nullifiers')
export class Nullifier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: false })
  hash: string;

  @Column({ name: 'did_id', nullable: true })
  didId: string | null;

  @ManyToOne(() => Did, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'did_id' })
  did: Did | null;

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
