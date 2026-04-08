import { Module } from '@nestjs/common';
import { AdminSettingsModule } from '../admin-settings/admin-settings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StudentsModule } from '../students/students.module';
import { AttentionScoreController } from './attention-score.controller';
import { AttentionScoreService } from './attention-score.service';

@Module({
  imports: [StudentsModule, AdminSettingsModule, NotificationsModule],
  controllers: [AttentionScoreController],
  providers: [AttentionScoreService],
  exports: [AttentionScoreService],
})
export class AttentionScoreModule {}
