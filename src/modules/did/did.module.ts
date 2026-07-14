import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DidController } from './did.controller';
import { DidService } from './did.service';
import { Did } from './entities/did.entity';
import { Wallet } from './entities/wallet.entity';
import { Nullifier } from './entities/nullifier.entity';
import { ConnectedApp } from './entities/connected-app.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Did, Wallet, Nullifier, ConnectedApp])],
  controllers: [DidController],
  providers: [DidService],
  exports: [DidService],
})
export class DidModule {}
