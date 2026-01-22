import { Module } from '@nestjs/common';
import { PatientPlansController } from './patient-plans.controller';
import { PatientPlansService } from './patient-plans.service';
import { DatabaseModule } from '../../database';

@Module({
  imports: [DatabaseModule],
  controllers: [PatientPlansController],
  providers: [PatientPlansService],
  exports: [PatientPlansService],
})
export class PatientPlansModule {}
