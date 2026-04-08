import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { StudentsService } from '../students/students.service';
import { CreateStudentLinkDto } from './dto/create-student-link.dto';
import { UpdateStudentLinkDto } from './dto/update-student-link.dto';

@Injectable()
export class StudentLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentsService: StudentsService,
  ) {}

  async createOwn(userId: string, dto: CreateStudentLinkDto) {
    const student = await this.studentsService.getOwnProfile(userId);

    return this.prisma.studentQuickLink.create({
      data: {
        studentId: student.id,
        title: dto.title,
        url: dto.url,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async listOwn(userId: string) {
    const student = await this.studentsService.getOwnProfile(userId);
    return this.listByStudentId(student.id);
  }

  async listByStudentId(studentId: string) {
    return this.prisma.studentQuickLink.findMany({
      where: { studentId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async updateOwn(userId: string, linkId: string, dto: UpdateStudentLinkDto) {
    const student = await this.studentsService.getOwnProfile(userId);
    const link = await this.findByIdOrThrow(linkId);

    if (link.studentId !== student.id) {
      throw new ForbiddenException('You can only update your own links');
    }

    return this.prisma.studentQuickLink.update({
      where: { id: linkId },
      data: {
        title: dto.title,
        url: dto.url,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async deleteOwn(userId: string, linkId: string) {
    const student = await this.studentsService.getOwnProfile(userId);
    const link = await this.findByIdOrThrow(linkId);

    if (link.studentId !== student.id) {
      throw new ForbiddenException('You can only delete your own links');
    }

    await this.prisma.studentQuickLink.delete({
      where: { id: linkId },
    });

    return { success: true };
  }

  async listAccessibleStudentLinks(
    studentId: string,
    actor: AuthenticatedUser,
  ) {
    if (actor.role === UserRole.STUDENT) {
      const ownProfile = await this.studentsService.getOwnProfile(actor.sub);

      if (ownProfile.id !== studentId) {
        throw new ForbiddenException('You can only access your own links');
      }
    } else if (actor.role === UserRole.MENTOR) {
      await this.studentsService.findAccessibleByIdOrThrow(studentId, actor);
    } else {
      await this.studentsService.findByIdOrThrow(studentId);
    }

    return this.listByStudentId(studentId);
  }

  private async findByIdOrThrow(id: string) {
    const link = await this.prisma.studentQuickLink.findUnique({
      where: { id },
    });

    if (!link) {
      throw new NotFoundException('Student link not found');
    }

    return link;
  }
}
