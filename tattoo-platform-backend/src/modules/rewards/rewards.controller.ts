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
import { AssignRewardDto } from './dto/assign-reward.dto';
import { CreateRewardDto } from './dto/create-reward.dto';
import { RewardsService } from './rewards.service';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { UpdateStudentRewardDto } from './dto/update-student-reward.dto';

@ApiTags('rewards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a reward template' })
  createReward(@Body() dto: CreateRewardDto) {
    return this.rewardsService.createReward(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MENTOR)
  @ApiOperation({ summary: 'List reward templates' })
  listRewards() {
    return this.rewardsService.listRewards();
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a reward template' })
  updateReward(@Param('id') id: string, @Body() dto: UpdateRewardDto) {
    return this.rewardsService.updateReward(id, dto);
  }

  @Post('assign')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign a reward to a student' })
  assignReward(@Body() dto: AssignRewardDto) {
    return this.rewardsService.assignReward(dto);
  }

  @Get('me')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'List rewards for the authenticated student' })
  listOwnRewards(@CurrentUser() user: AuthenticatedUser) {
    return this.rewardsService.listOwnRewards(user.sub);
  }

  @Get('student/:studentId')
  @Roles(UserRole.ADMIN, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({ summary: 'List rewards for an accessible student' })
  listStudentRewards(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rewardsService.listStudentRewards(studentId, user);
  }

  @Patch('student-rewards/:studentRewardId')
  @Roles(UserRole.ADMIN, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({ summary: 'Update an assigned student reward' })
  updateStudentReward(
    @Param('studentRewardId') studentRewardId: string,
    @Body() dto: UpdateStudentRewardDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rewardsService.updateStudentReward(studentRewardId, dto, user);
  }
}
