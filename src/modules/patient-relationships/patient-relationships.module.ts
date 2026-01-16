import { Module, forwardRef } from '@nestjs/common';
import { PatientRelationshipsController } from './patient-relationships.controller';
import { PatientRelationshipsService } from './patient-relationships.service';
import { MilestonesModule } from '../milestones/milestones.module';

@Module({
  imports: [forwardRef(() => MilestonesModule)],
  controllers: [PatientRelationshipsController],
  providers: [PatientRelationshipsService],
  exports: [PatientRelationshipsService],
})
export class PatientRelationshipsModule {}
