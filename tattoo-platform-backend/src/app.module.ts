import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/app-config.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminSettingsModule } from './modules/admin-settings/admin-settings.module';
import { AttentionScoreModule } from './modules/attention-score/attention-score.module';
import { AuditModule } from './modules/audit/audit.module';
import { ChallengesModule } from './modules/challenges/challenges.module';
import { CurrencyModule } from './modules/currency/currency.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EventsModule } from './modules/events/events.module';
import { GroupMeetingsModule } from './modules/group-meetings/group-meetings.module';
import { NewsModule } from './modules/news/news.module';
import { RegistrationCodesModule } from './modules/registration-codes/registration-codes.module';
import { GoalsModule } from './modules/goals/goals.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { MentorsModule } from './modules/mentors/mentors.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { StudentLinksModule } from './modules/student-links/student-links.module';
import { StudentDashboardLinksModule } from './modules/student-dashboard-links/student-dashboard-links.module';
import { StudentsModule } from './modules/students/students.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    AppConfigModule,
    CommonModule,
    PrismaModule,
    AdminSettingsModule,
    NotificationsModule,
    OnboardingModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    MentorsModule,
    StudentLinksModule,
    StudentDashboardLinksModule,
    MetricsModule,
    CurrencyModule,
    GoalsModule,
    ChallengesModule,
    RewardsModule,
    AttentionScoreModule,
    DashboardModule,
    EventsModule,
    GroupMeetingsModule,
    NewsModule,
    RegistrationCodesModule,
    AuditModule,
    IntegrationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
