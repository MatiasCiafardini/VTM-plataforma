import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MonthlyMetricPeriodStatus, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { PrismaService } from '../../../prisma/prisma.service';
import { AttentionScoreService } from '../../attention-score/attention-score.service';
import { StudentsService } from '../../students/students.service';
import { CreateMetricPeriodDto } from './dto/create-metric-period.dto';

@Injectable()
export class MetricPeriodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentsService: StudentsService,
    private readonly attentionScoreService: AttentionScoreService,
  ) {}

  async create(dto: CreateMetricPeriodDto, actor: AuthenticatedUser) {
    const studentId =
      actor.role === UserRole.STUDENT
        ? (await this.studentsService.getOwnProfile(actor.sub)).id
        : dto.studentId;

    if (!studentId) {
      throw new ForbiddenException('studentId is required for this role');
    }

    await this.studentsService.findByIdOrThrow(studentId);

    const existingPeriod = await this.prisma.monthlyMetricPeriod.findUnique({
      where: {
        studentId_month_year: {
          studentId,
          month: dto.month,
          year: dto.year,
        },
      },
    });

    if (existingPeriod) {
      throw new ConflictException(
        'A metric period already exists for that month',
      );
    }

    return this.prisma.monthlyMetricPeriod.create({
      data: {
        studentId,
        month: dto.month,
        year: dto.year,
        createdByUserId: actor.sub,
        updatedByUserId: actor.sub,
      },
      include: this.getPeriodInclude(),
    });
  }

  async findAccessiblePeriodByIdOrThrow(id: string, actor: AuthenticatedUser) {
    const period = await this.prisma.monthlyMetricPeriod.findUnique({
      where: { id },
      include: this.getPeriodInclude(),
    });

    if (!period) {
      throw new NotFoundException('Metric period not found');
    }

    if (actor.role === UserRole.ADMIN) {
      return period;
    }

    if (actor.role === UserRole.STUDENT) {
      const ownProfile = await this.studentsService.getOwnProfile(actor.sub);

      if (period.studentId !== ownProfile.id) {
        throw new ForbiddenException(
          'You can only access your own metric periods',
        );
      }

      return period;
    }

    await this.studentsService.findAccessibleByIdOrThrow(
      period.studentId,
      actor,
    );
    return period;
  }

  async findMyPeriods(actor: AuthenticatedUser, month?: number, year?: number) {
    const ownProfile = await this.studentsService.getOwnProfile(actor.sub);

    return this.prisma.monthlyMetricPeriod.findMany({
      where: {
        studentId: ownProfile.id,
        month,
        year,
      },
      include: this.getPeriodInclude(),
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async findStudentPeriods(
    studentId: string,
    actor: AuthenticatedUser,
    month?: number,
    year?: number,
  ) {
    await this.studentsService.findAccessibleByIdOrThrow(studentId, actor);

    return this.prisma.monthlyMetricPeriod.findMany({
      where: {
        studentId,
        month,
        year,
      },
      include: this.getPeriodInclude(),
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async submit(periodId: string, actor: AuthenticatedUser) {
    const period = await this.findAccessiblePeriodByIdOrThrow(periodId, actor);

    if (actor.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students can submit their periods');
    }

    if (period.status !== MonthlyMetricPeriodStatus.DRAFT) {
      throw new ConflictException('Only draft periods can be submitted');
    }

    const updated = await this.prisma.monthlyMetricPeriod.update({
      where: { id: periodId },
      data: {
        status: MonthlyMetricPeriodStatus.CLOSED,
        submittedAt: new Date(),
        closedAt: new Date(),
        updatedByUserId: actor.sub,
      },
      include: this.getPeriodInclude(),
    });

    await this.attentionScoreService.recalculateForStudent(updated.studentId, {
      month: updated.month,
      year: updated.year,
    });

    return updated;
  }

  async close(periodId: string, actor: AuthenticatedUser) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can close metric periods');
    }

    await this.findAccessiblePeriodByIdOrThrow(periodId, actor);

    const updated = await this.prisma.monthlyMetricPeriod.update({
      where: { id: periodId },
      data: {
        status: MonthlyMetricPeriodStatus.CLOSED,
        closedAt: new Date(),
        updatedByUserId: actor.sub,
      },
      include: this.getPeriodInclude(),
    });

    await this.attentionScoreService.recalculateForStudent(updated.studentId, {
      month: updated.month,
      year: updated.year,
    });

    return updated;
  }

  async reopen(periodId: string, actor: AuthenticatedUser) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can reopen metric periods');
    }

    await this.findAccessiblePeriodByIdOrThrow(periodId, actor);

    return this.prisma.monthlyMetricPeriod.update({
      where: { id: periodId },
      data: {
        status: MonthlyMetricPeriodStatus.DRAFT,
        closedAt: null,
        submittedAt: null,
        updatedByUserId: actor.sub,
      },
      include: this.getPeriodInclude(),
    });
  }

  private getPeriodInclude() {
    const asc = 'asc' as const;

    return {
      student: {
        include: {
          localCurrency: true,
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
      values: {
        include: {
          metricDefinition: {
            include: {
              category: true,
            },
          },
          originalCurrency: true,
          conversionSnapshot: true,
        },
        orderBy: [
          { metricDefinition: { category: { sortOrder: asc } } },
          { metricDefinition: { sortOrder: asc } },
        ],
      },
    };
  }
}
