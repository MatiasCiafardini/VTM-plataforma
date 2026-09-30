import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateFeedbackDto,
  ListFeedbacksDto,
  UpdateFeedbackDto,
} from './feedback.dto';

// Date-only Monday in the student's timezone; independent of the server timezone.
export function feedbackWeekStart(now: Date, timezone: string | null) {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }
  const parts = formatter.formatToParts(now);
  const part = (type: string) =>
    Number(parts.find((item) => item.type === type)!.value);
  const date = new Date(Date.UTC(part('year'), part('month') - 1, part('day')));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date;
}

const finalSelect = {
  id: true,
  studentId: true,
  weekStart: true,
  rating: true,
  feedback: true,
  achievement: true,
  version: true,
  createdAt: true,
  student: {
    select: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  },
} satisfies Prisma.MentorshipFeedbackSelect;

@Injectable()
export class FeedbacksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFeedbackDto) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true, timezone: true, user: { select: { status: true } } },
    });
    if (!student || student.user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Necesitas una cuenta de alumno activa.');
    }
    // The unique key makes a network retry return the same receipt, without changing content.
    return this.prisma.mentorshipFeedback.upsert({
      where: {
        studentId_submissionId: {
          studentId: student.id,
          submissionId: dto.submissionId,
        },
      },
      update: {},
      create: {
        studentId: student.id,
        submissionId: dto.submissionId,
        weekStart: feedbackWeekStart(new Date(), student.timezone),
        rating: dto.rating,
        feedback: dto.feedback,
        achievement: dto.achievement,
        originalRating: dto.rating,
        originalFeedback: dto.feedback,
        originalAchievement: dto.achievement,
      },
      select: { id: true, createdAt: true },
    });
  }

  async list(query: ListFeedbacksDto) {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException(
        'La fecha desde debe ser anterior a la fecha hasta.',
      );
    }
    const originals = query.originals === 'true';
    const until = query.to ? new Date(`${query.to}T00:00:00.000Z`) : undefined;
    if (until) until.setUTCDate(until.getUTCDate() + 1);
    const where: Prisma.MentorshipFeedbackWhereInput = {
      studentId: query.studentId,
      ...(query.rating
        ? { [originals ? 'originalRating' : 'rating']: query.rating }
        : {}),
      ...(query.from || until
        ? {
            createdAt: {
              gte: query.from
                ? new Date(`${query.from}T00:00:00.000Z`)
                : undefined,
              lt: until,
            },
          }
        : {}),
      ...(query.q
        ? {
            AND: query.q.split(/\s+/).map((word) => ({
              student: {
                user: {
                  OR: ['firstName', 'lastName', 'email'].map((field) => ({
                    [field]: { contains: word, mode: 'insensitive' },
                  })),
                },
              },
            })),
          }
        : {}),
    };
    const pageSize = 20;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.mentorshipFeedback.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * pageSize,
        take: pageSize,
        select: {
          ...finalSelect,
          originalRating: originals,
          originalFeedback: originals,
          originalAchievement: originals,
        },
      }),
      this.prisma.mentorshipFeedback.count({ where }),
    ]);
    return {
      items: items.map(
        ({ originalRating, originalFeedback, originalAchievement, ...item }) =>
          originals
            ? {
                ...item,
                rating: originalRating,
                feedback: originalFeedback,
                achievement: originalAchievement,
              }
            : item,
      ),
      total,
      page: query.page,
      pageSize,
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.mentorshipFeedback.findUnique({
      where: { id },
      select: finalSelect,
    });
    if (!item) throw new NotFoundException('No encontramos este feedback.');
    return item;
  }

  async update(id: string, userId: string, dto: UpdateFeedbackDto) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.mentorshipFeedback.findUnique({
        where: { id },
        select: finalSelect,
      });
      if (!before) throw new NotFoundException('No encontramos este feedback.');
      const result = await tx.mentorshipFeedback.updateMany({
        where: { id, version: dto.version },
        data: {
          rating: dto.rating,
          feedback: dto.feedback,
          achievement: dto.achievement,
          version: { increment: 1 },
        },
      });
      if (!result.count)
        throw new ConflictException(
          'Otro administrador actualizó este feedback. Cerrá y volvé a abrirlo antes de editar.',
        );
      await tx.auditLog.create({
        data: {
          userId,
          action: AuditAction.UPDATE,
          entityType: 'MentorshipFeedback',
          entityId: id,
          metadata: {
            before: {
              rating: before.rating,
              feedback: before.feedback,
              achievement: before.achievement,
              version: before.version,
            },
            after: {
              rating: dto.rating,
              feedback: dto.feedback,
              achievement: dto.achievement,
              version: dto.version + 1,
            },
          },
        },
      });
      return tx.mentorshipFeedback.findUniqueOrThrow({
        where: { id },
        select: finalSelect,
      });
    });
  }
}
