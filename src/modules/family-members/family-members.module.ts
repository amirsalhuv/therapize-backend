import { Module } from '@nestjs/common';
import { FamilyMembersController } from './family-members.controller';
import { FamilyDataController } from './family-data.controller';
import { FamilyMembersService } from './family-members.service';

@Module({
  controllers: [FamilyMembersController, FamilyDataController],
  providers: [FamilyMembersService],
  exports: [FamilyMembersService],
})
export class FamilyMembersModule {}
