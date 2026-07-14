import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Did } from './did.entity';

@Entity('connected_apps')
export class ConnectedApp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'did_id', nullable: false })
  didId: string;

  @ManyToOne(() => Did, (did) => did.connectedApps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'did_id' })
  did: Did;

  @Column({ name: 'app_name', nullable: false })
  appName: string;

  @Column({ name: 'app_url', nullable: false })
  appUrl: string;

  @Column({ name: 'access_granted_at', default: () => 'CURRENT_TIMESTAMP' })
  accessGrantedAt: Date;
}
