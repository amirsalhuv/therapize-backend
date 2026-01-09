import { Module } from '@nestjs/common';
import { PatientRelationshipsController } from './patient-relationships.controller';
import { PatientRelationshipsService } from './patient-relationships.service';

@Module({
  controllers: [PatientRelationshipsController],
  providers: [PatientRelationshipsService],
  exports: [PatientRelationshipsService],
})
export class PatientRelationshipsModule {}
