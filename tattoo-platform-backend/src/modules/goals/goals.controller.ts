import {
  Body,
  Controller,
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
import { AssignGoalDto } from './dto/assign-goal.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { UpdateStudentGoalDto } from './dto/update-student-goal.dto';
import { GoalsService } from './goals.service';

@ApiTags('goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a goal template' })
  createGoal(@Body() dto: CreateGoalDto) {
    return this.goalsService.createGoal(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MENTOR)
  @ApiOperation({ summary: 'List goal templates' })
  listGoals() {
    return this.goalsService.listGoals();
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a goal template' })
  updateGoal(@Param('id') id: string, @Body() dto: UpdateGoalDto) {
    return this.goalsService.updateGoal(id, dto);
  }

  @Post('assign')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign a goal to a student' })
  assignGoal(@Body() dto: AssignGoalDto) {
    return this.goalsService.assignGoal(dto);
  }

  @Get('me')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'List goals for the authenticated student' })
  listOwnGoals(@CurrentUser() user: AuthenticatedUser) {
    return this.goalsService.listOwnGoals(user.sub);
  }

  @Get('student/:studentId')
  @Roles(UserRole.ADMIN, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({ summary: 'List goals for an accessible student' })
  listStudentGoals(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.goalsService.listStudentGoals(studentId, user);
  }

  @Patch('student-goals/:studentGoalId')
  @Roles(UserRole.ADMIN, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({ summary: 'Update an assigned student goal' })
  updateStudentGoal(
    @Param('studentGoalId') studentGoalId: string,
    @Body() dto: UpdateStudentGoalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.goalsService.updateStudentGoal(studentGoalId, dto, user);
  }
}
