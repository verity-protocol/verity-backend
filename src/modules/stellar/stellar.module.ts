import { Module, Global } from '@nestjs/common';
import { StellarService } from './stellar.service';
import { SubmitQueue } from './submit-queue';
import { SigningKeysService } from './signing-keys.service';

@Global()
@Module({
  providers: [SubmitQueue, StellarService, SigningKeysService],
  exports: [StellarService, SigningKeysService],
})
export class StellarModule {}
