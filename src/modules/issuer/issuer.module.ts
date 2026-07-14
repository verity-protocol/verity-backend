import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssuerController } from './issuer.controller';
import { IssuerService } from './issuer.service';
import { Issuer } from './entities/issuer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Issuer])],
  controllers: [IssuerController],
  providers: [IssuerService],
  exports: [IssuerService],
})
export class IssuerModule {}
