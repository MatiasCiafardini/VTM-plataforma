import { Module } from '@nestjs/common';
import { AdminSettingsModule } from '../admin-settings/admin-settings.module';
import { AttentionScoreModule } from '../attention-score/attention-score.module';
import { MentorsModule } from '../mentors/mentors.module';
import { StudentsModule } from '../students/students.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    StudentsModule,
    MentorsModule,
    AttentionScoreModule,
    AdminSettingsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
