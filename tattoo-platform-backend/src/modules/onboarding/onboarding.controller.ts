import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CreateOnboardingPhaseDto } from './dto/create-onboarding-phase.dto';
import { CreateOnboardingStepDto } from './dto/create-onboarding-step.dto';
import { UpdateOnboardingPhaseDto } from './dto/update-onboarding-phase.dto';
import { UpdateOnboardingStepDto } from './dto/update-onboarding-step.dto';
import { UpdateOnboardingStepStatusDto } from './dto/update-onboarding-step-status.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('me')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Get onboarding roadmap for the authenticated student',
  })
  getOwnRoadmap(@CurrentUser() user: AuthenticatedUser) {
    return this.onboardingService.getOwnRoadmap(user);
  }

  @Get('student/:studentId')
  @Roles(UserRole.ADMIN, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get onboarding roadmap for an accessible student' })
  getStudentRoadmap(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.onboardingService.getStudentRoadmap(studentId, user);
  }

  @Get('mentor/students')
  @Roles(UserRole.MENTOR)
  @ApiOperation({ summary: 'List onboarding summaries for mentor students' })
  getMentorStudents(@CurrentUser() user: AuthenticatedUser) {
    return this.onboardingService.getMentorStudentSummaries(user);
  }

  @Get('admin/students')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List onboarding summaries for all students' })
  getAdminStudents(@CurrentUser() user: AuthenticatedUser) {
    return this.onboardingService.getAdminStudentSummaries(user);
  }

  @Get('admin/roadmap')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get the active onboarding roadmap for administration',
  })
  getAdminRoadmap() {
    return this.onboardingService.getAdminRoadmap();
  }

  @Post('admin/phases')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create an onboarding phase' })
  createPhase(@Body() dto: CreateOnboardingPhaseDto) {
    return this.onboardingService.createPhase(dto);
  }

  @Patch('admin/phases/:phaseId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an onboarding phase' })
  updatePhase(
    @Param('phaseId') phaseId: string,
    @Body() dto: UpdateOnboardingPhaseDto,
  ) {
    return this.onboardingService.updatePhase(phaseId, dto);
  }

  @Delete('admin/phases/:phaseId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete an onboarding phase' })
  deletePhase(@Param('phaseId') phaseId: string) {
    return this.onboardingService.deletePhase(phaseId);
  }

  @Post('admin/steps')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create an onboarding step' })
  createStep(@Body() dto: CreateOnboardingStepDto) {
    return this.onboardingService.createStep(dto);
  }

  @Patch('admin/steps/:stepId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an onboarding step' })
  updateStep(
    @Param('stepId') stepId: string,
    @Body() dto: UpdateOnboardingStepDto,
  ) {
    return this.onboardingService.updateStep(stepId, dto);
  }

  @Delete('admin/steps/:stepId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete an onboarding step' })
  deleteStep(@Param('stepId') stepId: string) {
    return this.onboardingService.deleteStep(stepId);
  }

  @Patch('steps/:stepId/status')
  @Roles(UserRole.ADMIN, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({
    summary: 'Update onboarding step completion for an accessible student',
  })
  updateStepStatus(
    @Param('stepId') stepId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOnboardingStepStatusDto,
  ) {
    return this.onboardingService.updateStepStatus(stepId, dto, user);
  }
}
