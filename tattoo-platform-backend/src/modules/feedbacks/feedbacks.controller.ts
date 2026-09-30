import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import {
  CreateFeedbackDto,
  ListFeedbacksDto,
  UpdateFeedbackDto,
} from './feedback.dto';
import { FeedbacksService } from './feedbacks.service';

@ApiTags('feedbacks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('feedbacks')
export class FeedbacksController {
  constructor(private readonly feedbacks: FeedbacksService) {}

  @Post()
  @Roles(UserRole.STUDENT)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedbacks.create(user.sub, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  list(@Query() query: ListFeedbacksDto) {
    return this.feedbacks.list(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.feedbacks.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateFeedbackDto,
  ) {
    return this.feedbacks.update(id, user.sub, dto);
  }
}
