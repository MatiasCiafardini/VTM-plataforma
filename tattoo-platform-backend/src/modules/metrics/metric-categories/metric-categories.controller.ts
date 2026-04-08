import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateMetricCategoryDto } from './dto/create-metric-category.dto';
import { UpdateMetricCategoryDto } from './dto/update-metric-category.dto';
import { MetricCategoriesService } from './metric-categories.service';

@ApiTags('metric-categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('metrics/categories')
export class MetricCategoriesController {
  constructor(
    private readonly metricCategoriesService: MetricCategoriesService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a metric category' })
  create(@Body() dto: CreateMetricCategoryDto) {
    return this.metricCategoriesService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({ summary: 'List metric categories' })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.metricCategoriesService.findAll(includeInactive === 'true');
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a metric category' })
  update(@Param('id') id: string, @Body() dto: UpdateMetricCategoryDto) {
    return this.metricCategoriesService.update(id, dto);
  }
}
