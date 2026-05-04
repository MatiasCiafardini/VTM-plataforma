import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { CreateAdminQuickLinkDto } from './dto/create-admin-quick-link.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateAdminQuickLinkDto } from './dto/update-admin-quick-link.dto';
import { UpdateOwnAdminProfileDto } from './dto/update-own-admin-profile.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get the authenticated admin profile' })
  getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getOwnAdminProfile(user.sub);
  }

  @Get('me/quick-links')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List quick links for the authenticated admin' })
  listMyQuickLinks(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listOwnAdminQuickLinks(user.sub);
  }

  @Post('me/quick-links')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a quick link for the authenticated admin' })
  createMyQuickLink(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAdminQuickLinkDto,
  ) {
    return this.usersService.createOwnAdminQuickLink(user.sub, dto);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a generic user' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Patch('me')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update the authenticated admin profile' })
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOwnAdminProfileDto,
  ) {
    return this.usersService.updateOwnAdminProfile(user.sub, dto);
  }

  @Patch('me/quick-links/:linkId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a quick link for the authenticated admin' })
  updateMyQuickLink(
    @CurrentUser() user: AuthenticatedUser,
    @Param('linkId') linkId: string,
    @Body() dto: UpdateAdminQuickLinkDto,
  ) {
    return this.usersService.updateOwnAdminQuickLink(user.sub, linkId, dto);
  }

  @Delete('me/quick-links/:linkId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a quick link for the authenticated admin' })
  deleteMyQuickLink(
    @CurrentUser() user: AuthenticatedUser,
    @Param('linkId') linkId: string,
  ) {
    return this.usersService.deleteOwnAdminQuickLink(user.sub, linkId);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a user status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.usersService.updateStatus(id, dto.status);
  }
}
