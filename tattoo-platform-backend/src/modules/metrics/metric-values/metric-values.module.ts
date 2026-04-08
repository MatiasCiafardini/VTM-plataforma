import { Module } from '@nestjs/common';
import { CurrencyModule } from '../../currency/currency.module';
import { MetricDefinitionsModule } from '../metric-definitions/metric-definitions.module';
import { MetricPeriodsModule } from '../metric-periods/metric-periods.module';
import { MetricValuesController } from './metric-values.controller';
import { MetricValuesService } from './metric-values.service';

@Module({
  imports: [MetricDefinitionsModule, MetricPeriodsModule, CurrencyModule],
  controllers: [MetricValuesController],
  providers: [MetricValuesService],
  exports: [MetricValuesService],
})
export class MetricValuesModule {}
