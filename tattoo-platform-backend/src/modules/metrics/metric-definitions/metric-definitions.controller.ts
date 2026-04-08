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
import { CreateMetricDefinitionDto } from './dto/create-metric-definition.dto';
import { UpdateMetricDefinitionDto } from './dto/update-metric-definition.dto';
import { MetricDefinitionsService } from './metric-definitions.service';

@ApiTags('metric-definitions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('metrics/definitions')
export class MetricDefinitionsController {
  constructor(
    private readonly metricDefinitionsService: MetricDefinitionsService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a metric definition' })
  create(@Body() dto: CreateMetricDefinitionDto) {
    return this.metricDefinitionsService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({ summary: 'List metric definitions' })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.metricDefinitionsService.findAll(includeInactive === 'true');
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a metric definition' })
  update(@Param('id') id: string, @Body() dto: UpdateMetricDefinitionDto) {
    return this.metricDefinitionsService.update(id, dto);
  }
}
