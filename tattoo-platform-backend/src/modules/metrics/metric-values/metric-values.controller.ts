import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { UpsertMetricValuesDto } from './dto/upsert-metric-value.dto';
import { MetricValuesService } from './metric-values.service';

@ApiTags('metric-values')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('metrics/periods/:periodId/values')
export class MetricValuesController {
  constructor(private readonly metricValuesService: MetricValuesService) {}

  @Put()
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @ApiOperation({ summary: 'Create or update metric values for a period' })
  upsert(
    @Param('periodId') periodId: string,
    @Body() dto: UpsertMetricValuesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.metricValuesService.upsertValues(periodId, dto, user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({ summary: 'List metric values for a period' })
  getValues(
    @Param('periodId') periodId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.metricValuesService.getValues(periodId, user);
  }
}
