import { Module } from '@nestjs/common';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';
import { DatabaseModule } from '../../database';
import { I18nModule } from '../../i18n';

@Module({
  imports: [DatabaseModule, I18nModule],
  controllers: [ExercisesController],
  providers: [ExercisesService],
  exports: [ExercisesService],
})
export class ExercisesModule {}
