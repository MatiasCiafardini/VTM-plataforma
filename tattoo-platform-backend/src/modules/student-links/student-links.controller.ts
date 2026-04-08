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
import { CreateStudentLinkDto } from './dto/create-student-link.dto';
import { UpdateStudentLinkDto } from './dto/update-student-link.dto';
import { StudentLinksService } from './student-links.service';

@ApiTags('student-links')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('student-links')
export class StudentLinksController {
  constructor(private readonly studentLinksService: StudentLinksService) {}

  @Post('me')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Create a quick link for the authenticated student',
  })
  createOwn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStudentLinkDto,
  ) {
    return this.studentLinksService.createOwn(user.sub, dto);
  }

  @Get('me')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'List quick links for the authenticated student' })
  listOwn(@CurrentUser() user: AuthenticatedUser) {
    return this.studentLinksService.listOwn(user.sub);
  }

  @Patch('me/:linkId')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Update a quick link for the authenticated student',
  })
  updateOwn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('linkId') linkId: string,
    @Body() dto: UpdateStudentLinkDto,
  ) {
    return this.studentLinksService.updateOwn(user.sub, linkId, dto);
  }

  @Delete('me/:linkId')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Delete a quick link for the authenticated student',
  })
  deleteOwn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('linkId') linkId: string,
  ) {
    return this.studentLinksService.deleteOwn(user.sub, linkId);
  }

  @Get('student/:studentId')
  @Roles(UserRole.ADMIN, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({ summary: 'List quick links for an accessible student' })
  listByStudent(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.studentLinksService.listAccessibleStudentLinks(studentId, user);
  }
}
