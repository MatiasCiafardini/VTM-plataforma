import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';

@Injectable()
export class NewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  listAll() {
    return this.prisma.news.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  listPublished() {
    return this.prisma.news.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createNews(dto: CreateNewsDto) {
    const news = await this.prisma.news.create({
      data: {
        title: dto.title.trim(),
        body: dto.body.trim(),
        isPublished: dto.isPublished ?? true,
      },
    });

    if (dto.notifyStudents !== false && news.isPublished) {
      await this.notificationsService.notifyNewsPublished({
        newsId: news.id,
        newsTitle: news.title,
      });
    }

    return news;
  }

  async updateNews(newsId: string, dto: UpdateNewsDto) {
    await this.findByIdOrThrow(newsId);

    return this.prisma.news.update({
      where: { id: newsId },
      data: {
        title: dto.title?.trim(),
        body: dto.body?.trim(),
        isPublished: dto.isPublished,
      },
    });
  }

  async deleteNews(newsId: string) {
    await this.findByIdOrThrow(newsId);
    await this.prisma.news.delete({ where: { id: newsId } });
    return { success: true };
  }

  private async findByIdOrThrow(newsId: string) {
    const news = await this.prisma.news.findUnique({ where: { id: newsId } });

    if (!news) {
      throw new NotFoundException('News item not found');
    }

    return news;
  }
}
