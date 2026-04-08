import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDashboardLinkDto } from './dto/create-student-dashboard-link.dto';
import { UpdateStudentDashboardLinkDto } from './dto/update-student-dashboard-link.dto';

@Injectable()
export class StudentDashboardLinksService {
  constructor(private readonly prisma: PrismaService) {}

  listAll() {
    return this.prisma.studentDashboardQuickLink.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  create(dto: CreateStudentDashboardLinkDto) {
    return this.prisma.studentDashboardQuickLink.create({
      data: {
        title: dto.title,
        url: dto.url,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(linkId: string, dto: UpdateStudentDashboardLinkDto) {
    await this.findByIdOrThrow(linkId);

    return this.prisma.studentDashboardQuickLink.update({
      where: { id: linkId },
      data: {
        title: dto.title,
        url: dto.url,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async delete(linkId: string) {
    await this.findByIdOrThrow(linkId);

    await this.prisma.studentDashboardQuickLink.delete({
      where: { id: linkId },
    });

    return { success: true };
  }

  private async findByIdOrThrow(linkId: string) {
    const link = await this.prisma.studentDashboardQuickLink.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      throw new NotFoundException('Dashboard link not found');
    }

    return link;
  }
}
