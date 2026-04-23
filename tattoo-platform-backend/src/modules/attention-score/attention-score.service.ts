import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  AttentionLevel,
  GoalStatus,
  MonthlyMetricPeriodStatus,
  UserRole,
} from '@prisma/client';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminSettingsService } from '../admin-settings/admin-settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StudentsService } from '../students/students.service';
import { RecalculateAttentionScoreDto } from './dto/recalculate-attention-score.dto';

@Injectable()
export class AttentionScoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentsService: StudentsService,
    private readonly adminSettingsService: AdminSettingsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async recalculate(
    dto: RecalculateAttentionScoreDto,
    actor: AuthenticatedUser,
  ) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only admins can recalculate attention scores',
      );
    }

    const targetStudents = dto.studentId
      ? [await this.studentsService.findByIdOrThrow(dto.studentId)]
      : await this.prisma.studentProfile.findMany({
          include: {
            user: true,
          },
        });

    const results: unknown[] = [];

    for (const student of targetStudents) {
      results.push(
        await this.recalculateForStudent(student.id, {
          month: dto.month,
          year: dto.year,
        }),
      );
    }

    return results;
  }

  async recalculateForStudent(
    studentId: string,
    filters?: { month?: number; year?: number },
  ) {
    const student = await this.studentsService.findByIdOrThrow(studentId);
    const latestPeriod = await this.findLatestPeriod(
      student.id,
      filters?.month,
      filters?.year,
    );
    const previousPeriod = latestPeriod
      ? await this.findPreviousPeriod(
          student.id,
          latestPeriod.month,
          latestPeriod.year,
        )
      : null;
    const studentGoals = await this.prisma.studentGoal.findMany({
      where: { studentId: student.id },
      orderBy: [{ updatedAt: 'desc' }],
    });
    const previousScore = await this.prisma.attentionScore.findFirst({
      where: { studentId: student.id },
      orderBy: { calculatedAt: 'desc' },
    });
    const result = await this.calculateScore({
      student,
      latestPeriod,
      previousPeriod,
      studentGoals,
    });

    const upserted = await this.prisma.attentionScore.upsert({
      where: {
        id: `${student.id}-${latestPeriod?.id ?? 'no-period'}`,
      },
      update: {
        monthlyMetricPeriodId: latestPeriod?.id ?? null,
        score: result.score,
        level: result.level,
        reasonNoMetrics: result.reasonNoMetrics,
        reasonIncomeDrop: result.reasonIncomeDrop,
        reasonLeadsDrop: result.reasonLeadsDrop,
        reasonClosuresDrop: result.reasonClosuresDrop,
        reasonGoalsMissed: result.reasonGoalsMissed,
        reasonInactivity: result.reasonInactivity,
        calculatedAt: new Date(),
      },
      create: {
        id: `${student.id}-${latestPeriod?.id ?? 'no-period'}`,
        studentId: student.id,
        monthlyMetricPeriodId: latestPeriod?.id ?? null,
        score: result.score,
        level: result.level,
        reasonNoMetrics: result.reasonNoMetrics,
        reasonIncomeDrop: result.reasonIncomeDrop,
        reasonLeadsDrop: result.reasonLeadsDrop,
        reasonClosuresDrop: result.reasonClosuresDrop,
        reasonGoalsMissed: result.reasonGoalsMissed,
        reasonInactivity: result.reasonInactivity,
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        monthlyMetricPeriod: true,
      },
    });

    await this.notificationsService.notifyRiskTransition({
      studentId: student.id,
      studentName: `${upserted.student.user.firstName} ${upserted.student.user.lastName}`,
      score: upserted.score,
      previousLevel: previousScore?.level ?? null,
      nextLevel: upserted.level,
      monthlyMetricPeriodId: upserted.monthlyMetricPeriodId,
    });

    return upserted;
  }

  async getScoresForAdmin(actor: AuthenticatedUser) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can access attention scores');
    }

    return this.prisma.attentionScore.findMany({
      include: {
        student: {
          include: {
            user: true,
          },
        },
        monthlyMetricPeriod: true,
      },
      orderBy: [{ level: 'desc' }, { score: 'desc' }, { calculatedAt: 'desc' }],
    });
  }

  async getScoresForMentor(actor: AuthenticatedUser) {
    if (actor.role !== UserRole.MENTOR) {
      throw new ForbiddenException(
        'Only mentors can access mentor attention scores',
      );
    }

    return this.prisma.attentionScore.findMany({
      where: {
        student: {
          mentorAssignments: {
            some: {
              mentor: {
                userId: actor.sub,
              },
            },
          },
        },
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        monthlyMetricPeriod: true,
      },
      orderBy: [{ level: 'desc' }, { score: 'desc' }, { calculatedAt: 'desc' }],
    });
  }

  private async findLatestPeriod(
    studentId: string,
    month?: number,
    year?: number,
  ) {
    return this.prisma.monthlyMetricPeriod.findFirst({
      where: {
        studentId,
        ...(month ? { month } : {}),
        ...(year ? { year } : {}),
      },
      include: {
        values: {
          include: {
            metricDefinition: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  private async findPreviousPeriod(
    studentId: string,
    month: number,
    year: number,
  ) {
    return this.prisma.monthlyMetricPeriod.findFirst({
      where: {
        studentId,
        OR: [{ year: { lt: year } }, { year, month: { lt: month } }],
      },
      include: {
        values: {
          include: {
            metricDefinition: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  private async calculateScore(params: {
    student: {
      user: {
        lastLoginAt: Date | null;
      };
    };
    latestPeriod: Awaited<
      ReturnType<AttentionScoreService['findLatestPeriod']>
    > | null;
    previousPeriod: Awaited<
      ReturnType<AttentionScoreService['findPreviousPeriod']>
    > | null;
    studentGoals: Array<{
      status: GoalStatus;
      dueDate: Date | null;
    }>;
  }) {
    const { student, latestPeriod, previousPeriod, studentGoals } = params;
    const settings = await this.adminSettingsService.getSettings();
    const metricConfig = settings.metrics;

    let score = 0;

    const reasonNoMetrics = !latestPeriod || latestPeriod.values.length === 0;
    const reasonInactivity =
      !student.user.lastLoginAt ||
      this.daysSince(student.user.lastLoginAt) > metricConfig.inactivityDays ||
      (latestPeriod?.status === MonthlyMetricPeriodStatus.DRAFT &&
        this.daysSince(latestPeriod.updatedAt) > metricConfig.staleDraftDays);

    const currentIncome = latestPeriod
      ? this.getMetricNumericValue(
          latestPeriod.values,
          metricConfig.revenueMetricSlug,
        )
      : null;
    const previousIncome = previousPeriod
      ? this.getMetricNumericValue(
          previousPeriod.values,
          metricConfig.revenueMetricSlug,
        )
      : null;
    const currentLeads = latestPeriod
      ? this.getMetricNumericValue(
          latestPeriod.values,
          metricConfig.leadsMetricSlug,
        )
      : null;
    const previousLeads = previousPeriod
      ? this.getMetricNumericValue(
          previousPeriod.values,
          metricConfig.leadsMetricSlug,
        )
      : null;
    const currentClosures = latestPeriod
      ? this.getMetricNumericValue(
          latestPeriod.values,
          metricConfig.closuresMetricSlug,
        )
      : null;
    const previousClosures = previousPeriod
      ? this.getMetricNumericValue(
          previousPeriod.values,
          metricConfig.closuresMetricSlug,
        )
      : null;

    const reasonIncomeDrop =
      currentIncome !== null &&
      previousIncome !== null &&
      currentIncome < previousIncome;
    const reasonLeadsDrop =
      currentLeads !== null &&
      previousLeads !== null &&
      currentLeads < previousLeads;
    const reasonClosuresDrop =
      currentClosures !== null &&
      previousClosures !== null &&
      currentClosures < previousClosures;
    const reasonGoalsMissed = studentGoals.some(
      (goal) =>
        goal.status === GoalStatus.MISSED ||
        (goal.dueDate !== null &&
          goal.dueDate.getTime() < Date.now() &&
          goal.status !== GoalStatus.ACHIEVED &&
          goal.status !== GoalStatus.CANCELLED),
    );

    if (reasonNoMetrics) {
      score += metricConfig.noMetricsWeight;
    }

    if (reasonIncomeDrop) {
      score += metricConfig.incomeDropWeight;
    }

    if (reasonLeadsDrop) {
      score += metricConfig.leadsDropWeight;
    }

    if (reasonClosuresDrop) {
      score += metricConfig.closuresDropWeight;
    }

    if (reasonGoalsMissed) {
      score += metricConfig.goalsMissedWeight;
    }

    if (reasonInactivity) {
      score += metricConfig.inactivityWeight;
    }

    let level: AttentionLevel = AttentionLevel.GREEN;

    if (score >= metricConfig.riskThreshold) {
      level = AttentionLevel.RED;
    } else if (score >= metricConfig.warningThreshold) {
      level = AttentionLevel.YELLOW;
    }

    return {
      score,
      level,
      reasonNoMetrics,
      reasonIncomeDrop,
      reasonLeadsDrop,
      reasonClosuresDrop,
      reasonGoalsMissed,
      reasonInactivity,
    };
  }

  private getMetricNumericValue(
    values: Array<{
      numberValue: unknown;
      originalAmount: unknown;
      usdAmount: unknown;
      metricDefinition: { slug: string };
    }>,
    slug: string,
  ) {
    const metric = values.find((value) => value.metricDefinition.slug === slug);

    if (!metric) {
      return null;
    }

    const candidate =
      metric.usdAmount ?? metric.originalAmount ?? metric.numberValue;

    return candidate === null || candidate === undefined
      ? null
      : Number(candidate);
  }

  private daysSince(date: Date) {
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    return Math.floor(
      (Date.now() - new Date(date).getTime()) / millisecondsPerDay,
    );
  }
}
