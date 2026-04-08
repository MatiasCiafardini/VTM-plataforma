import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { PeriodQueryDto } from '../dto/period-query.dto';
import { CreateMetricPeriodDto } from './dto/create-metric-period.dto';
import { MetricPeriodsService } from './metric-periods.service';

@ApiTags('metric-periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('metrics/periods')
export class MetricPeriodsController {
  constructor(private readonly metricPeriodsService: MetricPeriodsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @ApiOperation({ summary: 'Create a monthly metric period' })
  create(
    @Body() dto: CreateMetricPeriodDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.metricPeriodsService.create(dto, user);
  }

  @Get('me')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'List the authenticated student metric periods' })
  findMyPeriods(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PeriodQueryDto,
  ) {
    return this.metricPeriodsService.findMyPeriods(
      user,
      query.month,
      query.year,
    );
  }

  @Get('student/:studentId')
  @Roles(UserRole.ADMIN, UserRole.MENTOR)
  @ApiOperation({ summary: 'List periods for an accessible student' })
  findStudentPeriods(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PeriodQueryDto,
  ) {
    return this.metricPeriodsService.findStudentPeriods(
      studentId,
      user,
      query.month,
      query.year,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get a metric period by id' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.metricPeriodsService.findAccessiblePeriodByIdOrThrow(id, user);
  }

  @Post(':id/submit')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Submit a draft period' })
  submit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.metricPeriodsService.submit(id, user);
  }

  @Post(':id/close')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Close a period' })
  close(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.metricPeriodsService.close(id, user);
  }

  @Post(':id/reopen')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reopen a period back to draft' })
  reopen(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.metricPeriodsService.reopen(id, user);
  }
}
