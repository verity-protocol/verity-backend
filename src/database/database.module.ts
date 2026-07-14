import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Did } from '../modules/did/entities/did.entity';
import { Wallet } from '../modules/did/entities/wallet.entity';
import { Credential } from '../modules/credential/entities/credential.entity';
import { Issuer } from '../modules/issuer/entities/issuer.entity';
import { Nullifier } from '../modules/did/entities/nullifier.entity';
import { AuthorizationSession } from '../modules/auth/entities/authorization-session.entity';
import { ConnectedApp } from '../modules/did/entities/connected-app.entity';
import { IndexerEvent } from '../modules/indexer/entities/indexer-event.entity';

const entities = [
  Did,
  Wallet,
  Credential,
  Issuer,
  Nullifier,
  AuthorizationSession,
  ConnectedApp,
  IndexerEvent,
];

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities,
        synchronize: false,
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
  ],
})
export class DatabaseModule {}
