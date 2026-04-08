import { PartialType } from '@nestjs/swagger';
import { CreateMetricCategoryDto } from './create-metric-category.dto';

export class UpdateMetricCategoryDto extends PartialType(
  CreateMetricCategoryDto,
) {}
