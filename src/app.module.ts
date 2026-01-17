import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database';
import { I18nModule } from './i18n';
import { AuthModule } from './modules/auth';
import { UsersModule } from './modules/users/users.module';
import { PatientsModule } from './modules/patients/patients.module';
import { TherapistsModule } from './modules/therapists/therapists.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { FirstSessionFormsModule } from './modules/first-session-forms/first-session-forms.module';
import { PatientRelationshipsModule } from './modules/patient-relationships/patient-relationships.module';
import { LibraryModule } from './modules/library/library.module';
import { MilestonesModule } from './modules/milestones/milestones.module';
import { FamilyMembersModule } from './modules/family-members/family-members.module';
import { JwtAuthGuard, RolesGuard } from './modules/auth/guards';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    I18nModule,
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
        limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
      },
    ]),
    AuthModule,
    UsersModule,
    PatientsModule,
    TherapistsModule,
    SessionsModule,
    InvitationsModule,
    FirstSessionFormsModule,
    PatientRelationshipsModule,
    LibraryModule,
    MilestonesModule,
    FamilyMembersModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
