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
import { CreateGroupMeetingDto } from './dto/create-group-meeting.dto';
import { GroupMeetingsService } from './group-meetings.service';
import { UpdateGroupMeetingDto } from './dto/update-group-meeting.dto';

@ApiTags('group-meetings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('group-meetings')
export class GroupMeetingsController {
  constructor(private readonly groupMeetingsService: GroupMeetingsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all configured group meetings' })
  listMeetings() {
    return this.groupMeetingsService.listMeetings();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a group meeting' })
  createMeeting(@Body() dto: CreateGroupMeetingDto) {
    return this.groupMeetingsService.createMeeting(dto);
  }

  @Patch(':meetingId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a group meeting' })
  updateMeeting(
    @Param('meetingId') meetingId: string,
    @Body() dto: UpdateGroupMeetingDto,
  ) {
    return this.groupMeetingsService.updateMeeting(meetingId, dto);
  }

  @Delete(':meetingId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a group meeting' })
  deleteMeeting(@Param('meetingId') meetingId: string) {
    return this.groupMeetingsService.deleteMeeting(meetingId);
  }
}
