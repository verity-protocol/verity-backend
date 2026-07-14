import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { envValidationSchema } from './config/env.validation';
import { configuration } from './config/configuration';
import { DidModule } from './modules/did/did.module';
import { CredentialModule } from './modules/credential/credential.module';
import { AuthModule } from './modules/auth/auth.module';
import { KycModule } from './modules/kyc/kyc.module';
import { IndexerModule } from './modules/indexer/indexer.module';
import { StellarModule } from './modules/stellar/stellar.module';
import { IssuerModule } from './modules/issuer/issuer.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    DatabaseModule,
    StellarModule,
    DidModule,
    CredentialModule,
    AuthModule,
    KycModule,
    IssuerModule,
    IndexerModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
