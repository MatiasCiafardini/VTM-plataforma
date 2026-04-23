import { Module } from '@nestjs/common';
import { AttentionScoreModule } from '../../attention-score/attention-score.module';
import { StudentsModule } from '../../students/students.module';
import { MetricPeriodsController } from './metric-periods.controller';
import { MetricPeriodAutomationService } from './metric-period-automation.service';
import { MetricPeriodsService } from './metric-periods.service';

@Module({
  imports: [StudentsModule, AttentionScoreModule],
  controllers: [MetricPeriodsController],
  providers: [MetricPeriodsService, MetricPeriodAutomationService],
  exports: [MetricPeriodsService, MetricPeriodAutomationService],
})
export class MetricPeriodsModule {}
