import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Did } from './did.entity';

@Entity('wallets')
export class Wallet {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Stellar wallet address (G... public key)' })
  @Column({ nullable: false })
  address: string;

  @ApiProperty({ description: 'Associated DID identifier', format: 'uuid' })
  @Column({ name: 'did_id', nullable: false })
  didId: string;

  @ManyToOne(() => Did, (did) => did.wallets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'did_id' })
  did: Did;

  @ApiProperty({ description: 'Whether this is the primary wallet for the DID' })
  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @ApiProperty({ description: 'When the wallet was linked' })
  @Column({ name: 'linked_at', default: () => 'CURRENT_TIMESTAMP' })
  linkedAt: Date;
}
