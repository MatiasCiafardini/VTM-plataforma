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
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { NewsService } from './news.service';

@ApiTags('news')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all news (admin)' })
  listAll() {
    return this.newsService.listAll();
  }

  @Get('published')
  @Roles(UserRole.ADMIN, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({ summary: 'List published news (all roles)' })
  listPublished() {
    return this.newsService.listPublished();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a news item' })
  createNews(@Body() dto: CreateNewsDto) {
    return this.newsService.createNews(dto);
  }

  @Patch(':newsId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a news item' })
  updateNews(@Param('newsId') newsId: string, @Body() dto: UpdateNewsDto) {
    return this.newsService.updateNews(newsId, dto);
  }

  @Delete(':newsId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a news item' })
  deleteNews(@Param('newsId') newsId: string) {
    return this.newsService.deleteNews(newsId);
  }
}
