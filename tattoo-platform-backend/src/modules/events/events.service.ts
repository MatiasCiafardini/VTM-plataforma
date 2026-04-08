import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { StudentsService } from '../students/students.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentsService: StudentsService,
  ) {}

  async createEvent(dto: CreateEventDto, actor: AuthenticatedUser) {
    await this.ensureManageableStudent(dto.studentId, actor);

    return this.prisma.event.create({
      data: {
        studentId: dto.studentId,
        title: dto.title,
        description: dto.description,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        externalSource: dto.externalSource,
        externalId: dto.externalId,
      },
      include: this.eventInclude,
    });
  }

  async listOwnEvents(userId: string) {
    const student = await this.studentsService.getOwnProfile(userId);
    return this.listByStudentId(student.id);
  }

  async listStudentEvents(studentId: string, actor: AuthenticatedUser) {
    await this.ensureViewableStudent(studentId, actor);
    return this.listByStudentId(studentId);
  }

  async updateEvent(
    eventId: string,
    dto: UpdateEventDto,
    actor: AuthenticatedUser,
  ) {
    const event = await this.findByIdOrThrow(eventId);
    await this.ensureManageableStudent(event.studentId, actor);

    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        title: dto.title,
        description: dto.description,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        externalSource: dto.externalSource,
        externalId: dto.externalId,
      },
      include: this.eventInclude,
    });
  }

  async deleteEvent(eventId: string, actor: AuthenticatedUser) {
    const event = await this.findByIdOrThrow(eventId);
    await this.ensureManageableStudent(event.studentId, actor);

    await this.prisma.event.delete({
      where: { id: eventId },
    });

    return { success: true };
  }

  private listByStudentId(studentId: string) {
    return this.prisma.event.findMany({
      where: { studentId },
      include: this.eventInclude,
      orderBy: [{ startsAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  private async ensureViewableStudent(
    studentId: string,
    actor: AuthenticatedUser,
  ) {
    if (actor.role === UserRole.ADMIN) {
      await this.studentsService.findByIdOrThrow(studentId);
      return;
    }

    if (actor.role === UserRole.MENTOR) {
      await this.studentsService.findAccessibleByIdOrThrow(studentId, actor);
      return;
    }

    const student = await this.studentsService.getOwnProfile(actor.sub);
    if (student.id !== studentId) {
      throw new ForbiddenException('You can only access your own events');
    }
  }

  private async ensureManageableStudent(
    studentId: string,
    actor: AuthenticatedUser,
  ) {
    if (actor.role === UserRole.ADMIN) {
      await this.studentsService.findByIdOrThrow(studentId);
      return;
    }

    if (actor.role === UserRole.MENTOR) {
      await this.studentsService.findAccessibleByIdOrThrow(studentId, actor);
      return;
    }

    throw new ForbiddenException('Students cannot manage events');
  }

  private async findByIdOrThrow(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: this.eventInclude,
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  private readonly eventInclude = {
    student: {
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
          },
        },
      },
    },
  } as const;
}
