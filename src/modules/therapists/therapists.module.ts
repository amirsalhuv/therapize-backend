import { Module } from '@nestjs/common';
import { TherapistsController } from './therapists.controller';
import { TherapistsService } from './therapists.service';
import { PatientRelationshipsModule } from '../patient-relationships/patient-relationships.module';

@Module({
  imports: [PatientRelationshipsModule],
  controllers: [TherapistsController],
  providers: [TherapistsService],
  exports: [TherapistsService],
})
export class TherapistsModule {}
