import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('student')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get the student dashboard' })
  getStudentDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getStudentDashboard(user);
  }

  @Get('mentor')
  @Roles(UserRole.MENTOR)
  @ApiOperation({ summary: 'Get the mentor dashboard' })
  getMentorDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getMentorDashboard(user);
  }

  @Get('admin')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get the admin dashboard' })
  getAdminDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getAdminDashboard(user);
  }
}
