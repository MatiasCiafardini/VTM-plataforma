import { Module } from '@nestjs/common';
import { MetricCategoriesModule } from '../metric-categories/metric-categories.module';
import { MetricDefinitionsController } from './metric-definitions.controller';
import { MetricDefinitionsService } from './metric-definitions.service';

@Module({
  imports: [MetricCategoriesModule],
  controllers: [MetricDefinitionsController],
  providers: [MetricDefinitionsService],
  exports: [MetricDefinitionsService],
})
export class MetricDefinitionsModule {}
