import { Module } from '@nestjs/common';
import { MetricCategoriesController } from './metric-categories.controller';
import { MetricCategoriesService } from './metric-categories.service';

@Module({
  controllers: [MetricCategoriesController],
  providers: [MetricCategoriesService],
  exports: [MetricCategoriesService],
})
export class MetricCategoriesModule {}
