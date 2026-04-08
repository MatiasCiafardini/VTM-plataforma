import { Module } from '@nestjs/common';
import { MetricCategoriesModule } from './metric-categories/metric-categories.module';
import { MetricDefinitionsModule } from './metric-definitions/metric-definitions.module';
import { MetricPeriodsModule } from './metric-periods/metric-periods.module';
import { MetricValuesModule } from './metric-values/metric-values.module';

@Module({
  imports: [
    MetricCategoriesModule,
    MetricDefinitionsModule,
    MetricPeriodsModule,
    MetricValuesModule,
  ],
})
export class MetricsModule {}
