import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('indexer_events')
export class IndexerEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_type', nullable: false })
  eventType: string;

  @Column({ name: 'contract_id', nullable: false })
  contractId: string;

  @Column({ nullable: false })
  ledger: number;

  @Column({ name: 'transaction_hash', nullable: false })
  transactionHash: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, unknown> | null;

  @Column({ name: 'processed_at', nullable: true })
  processedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
