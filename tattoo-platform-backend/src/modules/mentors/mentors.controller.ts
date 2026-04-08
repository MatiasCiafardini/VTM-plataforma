import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AssignStudentDto } from './dto/assign-student.dto';
import { CreateMentorDto } from './dto/create-mentor.dto';
import { MentorsService } from './mentors.service';

@ApiTags('mentors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('mentors')
export class MentorsController {
  constructor(private readonly mentorsService: MentorsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a mentor user and profile' })
  create(@Body() dto: CreateMentorDto) {
    return this.mentorsService.createMentor(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all mentors' })
  findAll() {
    return this.mentorsService.findAll();
  }

  @Post(':mentorId/students')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign a student to a mentor' })
  assignStudent(
    @Param('mentorId') mentorId: string,
    @Body() dto: AssignStudentDto,
  ) {
    return this.mentorsService.assignStudent(mentorId, dto);
  }

  @Get('me/students')
  @Roles(UserRole.MENTOR)
  @ApiOperation({
    summary: 'List the students assigned to the authenticated mentor',
  })
  getMyStudents(@CurrentUser() user: AuthenticatedUser) {
    return this.mentorsService.getAssignedStudentsForMentorUser(user.sub);
  }
}
