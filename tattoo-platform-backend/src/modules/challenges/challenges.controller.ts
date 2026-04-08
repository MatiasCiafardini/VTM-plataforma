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
import { AssignChallengeDto } from './dto/assign-challenge.dto';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { UpdateChallengeDto } from './dto/update-challenge.dto';
import { UpdateStudentChallengeDto } from './dto/update-student-challenge.dto';
import { ChallengesService } from './challenges.service';

@ApiTags('challenges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a challenge template' })
  createChallenge(@Body() dto: CreateChallengeDto) {
    return this.challengesService.createChallenge(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MENTOR)
  @ApiOperation({ summary: 'List challenge templates' })
  listChallenges() {
    return this.challengesService.listChallenges();
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a challenge template' })
  updateChallenge(@Param('id') id: string, @Body() dto: UpdateChallengeDto) {
    return this.challengesService.updateChallenge(id, dto);
  }

  @Post('assign')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign a challenge to a student' })
  assignChallenge(@Body() dto: AssignChallengeDto) {
    return this.challengesService.assignChallenge(dto);
  }

  @Get('me')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'List challenges for the authenticated student' })
  listOwnChallenges(@CurrentUser() user: AuthenticatedUser) {
    return this.challengesService.listOwnChallenges(user.sub);
  }

  @Get('student/:studentId')
  @Roles(UserRole.ADMIN, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({ summary: 'List challenges for an accessible student' })
  listStudentChallenges(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.challengesService.listStudentChallenges(studentId, user);
  }

  @Patch('student-challenges/:studentChallengeId')
  @Roles(UserRole.ADMIN, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({ summary: 'Update an assigned student challenge' })
  updateStudentChallenge(
    @Param('studentChallengeId') studentChallengeId: string,
    @Body() dto: UpdateStudentChallengeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.challengesService.updateStudentChallenge(
      studentChallengeId,
      dto,
      user,
    );
  }
}
