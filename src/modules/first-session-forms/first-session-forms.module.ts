import { Module } from '@nestjs/common';
import { FirstSessionFormsController } from './first-session-forms.controller';
import { FirstSessionFormsService } from './first-session-forms.service';
import { MilestonesModule } from '../milestones/milestones.module';

@Module({
  imports: [MilestonesModule],
  controllers: [FirstSessionFormsController],
  providers: [FirstSessionFormsService],
  exports: [FirstSessionFormsService],
})
export class FirstSessionFormsModule {}
