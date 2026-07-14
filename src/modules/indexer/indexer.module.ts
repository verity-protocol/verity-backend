import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndexerService } from './indexer.service';
import { IndexerEvent } from './entities/indexer-event.entity';
import { StellarModule } from '../stellar/stellar.module';

@Module({
  imports: [TypeOrmModule.forFeature([IndexerEvent]), StellarModule],
  providers: [IndexerService],
  exports: [IndexerService],
})
export class IndexerModule {}
