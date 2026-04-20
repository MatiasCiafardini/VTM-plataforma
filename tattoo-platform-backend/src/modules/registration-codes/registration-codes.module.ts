import { Module } from '@nestjs/common';
import { RegistrationCodesController } from './registration-codes.controller';
import { RegistrationCodesService } from './registration-codes.service';

@Module({
  controllers: [RegistrationCodesController],
  providers: [RegistrationCodesService],
  exports: [RegistrationCodesService],
})
export class RegistrationCodesModule {}
