import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthorizationSession } from './entities/authorization-session.entity';
import { DidModule } from '../did/did.module';

@Module({
  imports: [TypeOrmModule.forFeature([AuthorizationSession]), DidModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
