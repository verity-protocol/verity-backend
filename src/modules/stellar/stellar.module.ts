import { Module, Global } from '@nestjs/common';
import { StellarService } from './stellar.service';
import { SubmitQueue } from './submit-queue';

@Global()
@Module({
  providers: [SubmitQueue, StellarService],
  exports: [StellarService],
})
export class StellarModule {}
