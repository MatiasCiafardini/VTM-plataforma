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
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateStudentDashboardLinkDto } from './dto/create-student-dashboard-link.dto';
import { UpdateStudentDashboardLinkDto } from './dto/update-student-dashboard-link.dto';
import { StudentDashboardLinksService } from './student-dashboard-links.service';

@ApiTags('student-dashboard-links')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('student-dashboard-links')
export class StudentDashboardLinksController {
  constructor(
    private readonly studentDashboardLinksService: StudentDashboardLinksService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List student dashboard quick links' })
  listAll() {
    return this.studentDashboardLinksService.listAll();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a student dashboard quick link' })
  create(@Body() dto: CreateStudentDashboardLinkDto) {
    return this.studentDashboardLinksService.create(dto);
  }

  @Patch(':linkId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a student dashboard quick link' })
  update(
    @Param('linkId') linkId: string,
    @Body() dto: UpdateStudentDashboardLinkDto,
  ) {
    return this.studentDashboardLinksService.update(linkId, dto);
  }

  @Delete(':linkId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a student dashboard quick link' })
  delete(@Param('linkId') linkId: string) {
    return this.studentDashboardLinksService.delete(linkId);
  }
}
