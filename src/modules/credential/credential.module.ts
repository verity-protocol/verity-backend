import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CredentialController } from './credential.controller';
import { CredentialService } from './credential.service';
import { Credential } from './entities/credential.entity';
import { Did } from '../did/entities/did.entity';
import { Issuer } from '../issuer/entities/issuer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Credential, Did, Issuer])],
  controllers: [CredentialController],
  providers: [CredentialService],
  exports: [CredentialService],
})
export class CredentialModule {}
