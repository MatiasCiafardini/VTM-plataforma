import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  ChallengeStatus,
  MonthlyMetricPeriodStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminSettingsService } from '../admin-settings/admin-settings.service';
import { AttentionScoreService } from '../attention-score/attention-score.service';
import { MentorsService } from '../mentors/mentors.service';
import { StudentsService } from '../students/students.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentsService: StudentsService,
    private readonly mentorsService: MentorsService,
    private readonly attentionScoreService: AttentionScoreService,
    private readonly adminSettingsService: AdminSettingsService,
  ) {}

  async getStudentDashboard(actor: AuthenticatedUser) {
    if (actor.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students can access this dashboard');
    }

    const student = await this.studentsService.getOwnProfile(actor.sub);
    const trackedMetrics = await this.getTrackedMetrics();
    await this.attentionScoreService.recalculateForStudent(student.id);
    const [
      periods,
      latestAttentionScore,
      dashboardQuickLinks,
      quickLinks,
      goals,
      studentChallenges,
      activeChallengeTemplates,
      rewards,
      upcomingEvents,
    ] = await Promise.all([
      this.prisma.monthlyMetricPeriod.findMany({
        where: { studentId: student.id },
        include: {
          values: {
            include: {
              metricDefinition: true,
            },
          },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 6,
      }),
      this.prisma.attentionScore.findFirst({
        where: { studentId: student.id },
        orderBy: { calculatedAt: 'desc' },
      }),
      this.prisma.studentDashboardQuickLink.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        take: 5,
      }),
      this.prisma.studentQuickLink.findMany({
        where: { studentId: student.id },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        take: 5,
      }),
      this.prisma.studentGoal.findMany({
        where: { studentId: student.id },
        include: { goal: true },
        orderBy: [{ updatedAt: 'desc' }],
        take: 5,
      }),
      this.prisma.studentChallenge.findMany({
        where: { studentId: student.id },
        include: {
          challenge: {
            include: {
              metricDefinition: true,
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: 5,
      }),
      this.prisma.challenge.findMany({
        where: { isActive: true },
        include: {
          metricDefinition: true,
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.studentReward.findMany({
        where: { studentId: student.id },
        include: { reward: true },
        orderBy: [{ updatedAt: 'desc' }],
        take: 5,
      }),
      this.prisma.event.findMany({
        where: {
          studentId: student.id,
          startsAt: {
            gte: new Date(),
          },
        },
        orderBy: [{ startsAt: 'asc' }],
        take: 5,
      }),
    ]);

    const latestPeriod = periods[0] ?? null;
    const metricsBySlug = latestPeriod
      ? Object.fromEntries(
          latestPeriod.values.map((value) => [
            value.metricDefinition.slug,
            {
              value:
                value.usdAmount ??
                value.originalAmount ??
                value.numberValue ??
                value.textValue ??
                value.booleanValue,
            },
          ]),
        )
      : {};

    const assignedChallengeIds = new Set(
      studentChallenges.map((challenge) => challenge.challengeId),
    );

    const mergedChallenges = [
      ...studentChallenges.map((studentChallenge) => {
        const progress = this.getChallengeProgress(
          metricsBySlug,
          studentChallenge.challenge.metricDefinition?.slug ?? null,
          studentChallenge.challenge.targetValue,
          studentChallenge.status,
        );

        return {
          id: studentChallenge.id,
          status: progress.status,
          dueDate: studentChallenge.dueDate,
          progress: progress.progress,
          currentValue: progress.currentValue,
          targetValue: studentChallenge.challenge.targetValue
            ? Number(studentChallenge.challenge.targetValue)
            : null,
          difficultyStars: studentChallenge.challenge.difficultyStars,
          challenge: {
            title: studentChallenge.challenge.title,
            description: studentChallenge.challenge.description,
            iconKey: studentChallenge.challenge.iconKey,
            rewardTitle: studentChallenge.challenge.rewardTitle,
            rewardUrl: studentChallenge.challenge.rewardUrl,
            metricSlug: studentChallenge.challenge.metricDefinition?.slug ?? null,
          },
        };
      }),
      ...activeChallengeTemplates
        .filter((challenge) => !assignedChallengeIds.has(challenge.id))
        .map((challenge) => {
          const progress = this.getChallengeProgress(
            metricsBySlug,
            challenge.metricDefinition?.slug ?? null,
            challenge.targetValue,
            ChallengeStatus.ASSIGNED,
          );

          return {
            id: `template:${challenge.id}`,
            status: progress.status,
            dueDate: null,
            progress: progress.progress,
            currentValue: progress.currentValue,
            targetValue: challenge.targetValue ? Number(challenge.targetValue) : null,
            difficultyStars: challenge.difficultyStars,
            challenge: {
              title: challenge.title,
              description: challenge.description,
              iconKey: challenge.iconKey,
              rewardTitle: challenge.rewardTitle,
              rewardUrl: challenge.rewardUrl,
              metricSlug: challenge.metricDefinition?.slug ?? null,
            },
          };
        }),
    ].sort((a, b) => {
      if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') {
        return -1;
      }

      if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') {
        return 1;
      }

      return a.challenge.title.localeCompare(b.challenge.title, 'es');
    });

    return {
      student: {
        id: student.id,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        email: student.user.email,
        country: student.country,
        localCurrency: student.localCurrency,
        displayCurrencyMode: student.displayCurrencyMode,
      },
      summary: {
        totalPeriods: periods.length,
        latestPeriodStatus: latestPeriod?.status ?? null,
        latestPeriodMonth: latestPeriod?.month ?? null,
        latestPeriodYear: latestPeriod?.year ?? null,
        metricsLoadedInLatestPeriod: latestPeriod?.values.length ?? 0,
        attentionLevel: latestAttentionScore?.level ?? null,
        attentionScore: latestAttentionScore?.score ?? null,
      },
      metricLabels: trackedMetrics.labels,
      latestMetrics: {
        ingresosFacturacion:
          metricsBySlug[trackedMetrics.revenueMetricSlug]?.value ?? null,
        consultasMensuales: metricsBySlug[trackedMetrics.leadsMetricSlug]?.value ?? null,
        cierresDelMes: metricsBySlug[trackedMetrics.closuresMetricSlug]?.value ?? null,
      },
      evolution: periods
        .slice()
        .reverse()
        .map((period) => ({
          id: period.id,
          month: period.month,
          year: period.year,
          status: period.status,
          metricsCount: period.values.length,
          balanceGeneral: this.getMetricNumericValue(
            period.values,
            'balance-general',
          ),
          ingresosFacturacion: this.getMetricNumericValue(
            period.values,
            trackedMetrics.revenueMetricSlug,
          ),
          cantidadTotalTatuajes: this.getMetricNumericValue(
            period.values,
            'cantidad-total-tatuajes',
          ),
          comisionEstudio: this.getMetricNumericValue(
            period.values,
            'comision-estudio',
          ),
          comisionEstudioPorcentaje: this.getMetricNumericValue(
            period.values,
            'comision-estudio-porcentaje',
          ),
          gastosDelMes: this.getMetricNumericValue(
            period.values,
            'gastos-del-mes',
          ),
          seguidoresInstagramActuales: this.getMetricNumericValue(
            period.values,
            'seguidores-instagram-actuales',
          ),
          consultasMensuales: this.getMetricNumericValue(
            period.values,
            trackedMetrics.leadsMetricSlug,
          ),
          conversacionesANuevos: this.getMetricNumericValue(
            period.values,
            'conversaciones-a-nuevos',
          ),
          cotizaciones: this.getMetricNumericValue(
            period.values,
            'cotizaciones',
          ),
          cierresDelMes: this.getMetricNumericValue(
            period.values,
            trackedMetrics.closuresMetricSlug,
          ),
          cierresNuevosClientes: this.getMetricNumericValue(
            period.values,
            'cierres-nuevos-clientes',
          ),
          cierresPorRecomendaciones: this.getMetricNumericValue(
            period.values,
            'cierres-por-recomendaciones',
          ),
          cierresRecurrentes: this.getMetricNumericValue(
            period.values,
            'cierres-recurrentes',
          ),
        })),
      dashboardQuickLinks,
      quickLinks,
      goals,
      challenges: mergedChallenges,
      rewards,
      upcomingEvents,
    };
  }

  async getMentorDashboard(actor: AuthenticatedUser) {
    if (actor.role !== UserRole.MENTOR) {
      throw new ForbiddenException('Only mentors can access this dashboard');
    }

    const trackedMetrics = await this.getTrackedMetrics();
    const assignedStudents =
      await this.mentorsService.getAssignedStudentsForMentorUser(actor.sub);

    await Promise.all(
      assignedStudents.map((student) =>
        this.attentionScoreService.recalculateForStudent(student.id),
      ),
    );

    const studentsWithPeriods = await Promise.all(
      assignedStudents.map(async (student) => {
        const recentPeriods = await this.prisma.monthlyMetricPeriod.findMany({
          where: { studentId: student.id },
          include: {
            values: {
              include: {
                metricDefinition: true,
              },
            },
          },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 6,
        });
        const latestPeriod = recentPeriods[0] ?? null;
        const previousPeriod = recentPeriods[1] ?? null;

        const latestScore = await this.prisma.attentionScore.findFirst({
          where: { studentId: student.id },
          orderBy: { calculatedAt: 'desc' },
        });

        return {
          studentId: student.id,
          name: `${student.user.firstName} ${student.user.lastName}`,
          email: student.user.email,
          country: student.country,
          latestPeriodStatus: latestPeriod?.status ?? null,
          latestPeriodMonth: latestPeriod?.month ?? null,
          latestPeriodYear: latestPeriod?.year ?? null,
          consultasMensuales: latestPeriod
            ? this.getMetricNumericValue(
                latestPeriod.values,
                trackedMetrics.leadsMetricSlug,
              )
            : null,
          cierresDelMes: latestPeriod
            ? this.getMetricNumericValue(
                latestPeriod.values,
                trackedMetrics.closuresMetricSlug,
              )
            : null,
          ingresosFacturacion: latestPeriod
            ? this.getMetricNumericValue(
                latestPeriod.values,
                trackedMetrics.revenueMetricSlug,
              )
            : null,
          attentionLevel: latestScore?.level ?? null,
          attentionScore: latestScore?.score ?? null,
          riskSummary: this.buildMentorRiskSummary({
            latestScore,
            latestPeriod,
            previousPeriod,
            metricLabels: trackedMetrics.labels,
            trackedMetricSlugs: {
              revenue: trackedMetrics.revenueMetricSlug,
              leads: trackedMetrics.leadsMetricSlug,
              closures: trackedMetrics.closuresMetricSlug,
            },
          }),
          recentPeriods: recentPeriods.map((period) => ({
            id: period.id,
            month: period.month,
            year: period.year,
            status: period.status,
            metricsCount: period.values.length,
            ingresosFacturacion: this.getMetricNumericValue(
              period.values,
              trackedMetrics.revenueMetricSlug,
            ),
            consultasMensuales: this.getMetricNumericValue(
              period.values,
              trackedMetrics.leadsMetricSlug,
            ),
            cierresDelMes: this.getMetricNumericValue(
              period.values,
              trackedMetrics.closuresMetricSlug,
            ),
            values: period.values.map((value) => ({
              id: value.id,
              metricName: value.metricDefinition.name,
              metricSlug: value.metricDefinition.slug,
              value:
                value.usdAmount ??
                value.originalAmount ??
                value.numberValue ??
                value.textValue ??
                value.booleanValue,
            })),
          })),
        };
      }),
    );

    return {
      metricLabels: trackedMetrics.labels,
      summary: {
        assignedStudents: assignedStudents.length,
        studentsWithDraft: studentsWithPeriods.filter(
          (student) =>
            student.latestPeriodStatus === MonthlyMetricPeriodStatus.DRAFT,
        ).length,
        studentsWithSubmitted: studentsWithPeriods.filter(
          (student) =>
            student.latestPeriodStatus === MonthlyMetricPeriodStatus.SUBMITTED,
        ).length,
        studentsWithClosed: studentsWithPeriods.filter(
          (student) =>
            student.latestPeriodStatus === MonthlyMetricPeriodStatus.CLOSED,
        ).length,
        studentsWithoutPeriods: studentsWithPeriods.filter(
          (student) => !student.latestPeriodStatus,
        ).length,
        redAttentionStudents: studentsWithPeriods.filter(
          (student) => student.attentionLevel === 'RED',
        ).length,
        yellowAttentionStudents: studentsWithPeriods.filter(
          (student) => student.attentionLevel === 'YELLOW',
        ).length,
      },
      students: studentsWithPeriods,
    };
  }

  async getAdminDashboard(actor: AuthenticatedUser) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can access this dashboard');
    }

    const trackedMetrics = await this.getTrackedMetrics();
    const revenueMetricSlug = trackedMetrics.revenueMetricSlug;
    const [
      students,
      periods,
      mentors,
      goals,
      challenges,
      rewards,
      upcomingEvents,
    ] = await Promise.all([
      this.prisma.studentProfile.findMany({
        include: {
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.monthlyMetricPeriod.findMany({
        include: {
          student: {
            include: {
              user: true,
            },
          },
          values: {
            include: {
              metricDefinition: true,
            },
          },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      this.prisma.mentorProfile.findMany(),
      this.prisma.goal.count({ where: { isActive: true } }),
      this.prisma.challenge.findMany({
        where: { isActive: true },
        include: {
          metricDefinition: true,
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.reward.count({ where: { isActive: true } }),
      this.prisma.event.count({
        where: {
          startsAt: {
            gte: new Date(),
          },
        },
      }),
    ]);

    await Promise.all(
      students.map((student) =>
        this.attentionScoreService.recalculateForStudent(student.id),
      ),
    );

    const attentionScores = await this.attentionScoreService.getScoresForAdmin(actor);

    const latestPeriodByStudent = new Map<string, (typeof periods)[number]>();
    for (const period of periods) {
      if (!latestPeriodByStudent.has(period.studentId)) {
        latestPeriodByStudent.set(period.studentId, period);
      }
    }

    const latestMonth = periods[0]?.month ?? null;
    const latestYear = periods[0]?.year ?? null;
    const totalRevenueHistorical = periods.reduce(
      (sum, period) =>
        sum + (this.getMetricNumericValue(period.values, revenueMetricSlug) ?? 0),
      0,
    );
    const totalRevenueLatestMonth = periods.reduce((sum, period) => {
      const isLatestPeriod =
        latestMonth !== null &&
        latestYear !== null &&
        period.month === latestMonth &&
        period.year === latestYear;

      if (!isLatestPeriod) {
        return sum;
      }

      return (
        sum + (this.getMetricNumericValue(period.values, revenueMetricSlug) ?? 0)
      );
    }, 0);
    const averageProgress =
      students.length === 0
        ? 0
        : Math.round(
            ((periods.filter(
              (period) =>
                period.status === MonthlyMetricPeriodStatus.SUBMITTED ||
                period.status === MonthlyMetricPeriodStatus.CLOSED,
            ).length /
              students.length) *
              100),
          );

    const studentStatusOverview = students.map((student) => {
      const latestPeriod = latestPeriodByStudent.get(student.id) ?? null;
      const latestScore =
        attentionScores.find((score) => score.studentId === student.id) ?? null;
      const previousPeriod = periods.find(
        (period) =>
          period.studentId === student.id &&
          latestPeriod &&
          (period.year < latestPeriod.year ||
            (period.year === latestPeriod.year && period.month < latestPeriod.month)),
      );

      return {
        studentId: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        email: student.user.email,
        country: student.country,
        userStatus: student.user.status,
        latestPeriodStatus: latestPeriod?.status ?? null,
        latestPeriodMonth: latestPeriod?.month ?? null,
        latestPeriodYear: latestPeriod?.year ?? null,
        latestRevenue: latestPeriod
          ? this.getMetricNumericValue(latestPeriod.values, revenueMetricSlug)
          : null,
        attentionLevel: latestScore?.level ?? null,
        attentionScore: latestScore?.score ?? null,
        riskSummary: this.buildMentorRiskSummary({
          latestScore,
          latestPeriod,
          previousPeriod: previousPeriod ?? null,
          metricLabels: trackedMetrics.labels,
          trackedMetricSlugs: {
            revenue: trackedMetrics.revenueMetricSlug,
            leads: trackedMetrics.leadsMetricSlug,
            closures: trackedMetrics.closuresMetricSlug,
          },
        }),
        revenueHistory: periods
          .filter((period) => period.studentId === student.id)
          .map((period) => ({
            id: period.id,
            month: period.month,
            year: period.year,
            ingresosFacturacion: this.getMetricNumericValue(
              period.values,
              revenueMetricSlug,
            ),
          })),
      };
    });

    const completedAchievements = students
      .flatMap((student) => {
        const studentPeriods = periods.filter(
          (period) =>
            period.studentId === student.id &&
            period.status === MonthlyMetricPeriodStatus.CLOSED,
        );

        return challenges
          .map((challenge) => {
            if (!challenge.metricDefinition || challenge.targetValue === null) {
              return null;
            }

            const matchingPeriods = studentPeriods
              .map((period) => {
                const currentValue = this.getMetricNumericValue(
                  period.values,
                  challenge.metricDefinition!.slug,
                );

                if (currentValue === null || currentValue < Number(challenge.targetValue)) {
                  return null;
                }

                return {
                  period,
                  currentValue,
                };
              })
              .filter(
                (
                  achievement,
                ): achievement is {
                  period: (typeof studentPeriods)[number];
                  currentValue: number;
                } => achievement !== null,
              )
              .sort((left, right) => {
                if (left.period.year !== right.period.year) {
                  return right.period.year - left.period.year;
                }

                return right.period.month - left.period.month;
              });

            const latestAchievement = matchingPeriods[0];

            if (!latestAchievement) {
              return null;
            }

            return {
              id: `${student.id}:${challenge.id}:${latestAchievement.period.year}:${latestAchievement.period.month}`,
              completedAt: new Date(
                Date.UTC(
                  latestAchievement.period.year,
                  latestAchievement.period.month - 1,
                  1,
                ),
              ).toISOString(),
              month: latestAchievement.period.month,
              year: latestAchievement.period.year,
              studentId: student.id,
              studentName: `${student.user.firstName} ${student.user.lastName}`,
              studentEmail: student.user.email,
              challengeId: challenge.id,
              challengeTitle: challenge.title,
              challengeDescription: challenge.description,
              difficultyStars: challenge.difficultyStars,
              metricName: challenge.metricDefinition.name,
              targetValue: Number(challenge.targetValue),
              currentValue: latestAchievement.currentValue,
            };
          })
          .filter((achievement) => achievement !== null);
      })
      .sort((left, right) => {
        const leftTime = new Date(left.completedAt).getTime();
        const rightTime = new Date(right.completedAt).getTime();

        if (leftTime !== rightTime) {
          return rightTime - leftTime;
        }

        return right.currentValue - left.currentValue;
      });

    return {
      metricLabels: trackedMetrics.labels,
      summary: {
        totalStudents: students.length,
        activeStudents: students.filter(
          (student) => student.user.status === UserStatus.ACTIVE,
        ).length,
        inactiveStudents: students.filter(
          (student) => student.user.status === UserStatus.INACTIVE,
        ).length,
        totalMentors: mentors.length,
        totalPeriods: periods.length,
        periodsDraft: periods.filter(
          (period) => period.status === MonthlyMetricPeriodStatus.DRAFT,
        ).length,
        periodsSubmitted: periods.filter(
          (period) => period.status === MonthlyMetricPeriodStatus.SUBMITTED,
        ).length,
        periodsClosed: periods.filter(
          (period) => period.status === MonthlyMetricPeriodStatus.CLOSED,
        ).length,
        studentsNeedingAttention: studentStatusOverview.filter(
          (student) => this.studentNeedsAttention(student),
        ).length,
        activeGoals: goals,
        activeChallenges: challenges.length,
        activeRewards: rewards,
        upcomingEvents,
        totalRevenueHistorical,
        totalRevenueLatestMonth,
        averageProgress,
      },
      studentOverview: studentStatusOverview,
      completedAchievements,
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

  private getChallengeProgress(
    metricsBySlug: Record<string, { value: unknown }>,
    metricSlug: string | null,
    targetValue: unknown,
    baseStatus: ChallengeStatus,
  ) {
    const target =
      targetValue === null || targetValue === undefined
        ? null
        : Number(targetValue);
    const currentCandidate =
      metricSlug && metricsBySlug[metricSlug]
        ? metricsBySlug[metricSlug].value
        : null;
    const currentValue =
      currentCandidate === null || currentCandidate === undefined
        ? null
        : Number(currentCandidate);

    if (!target || target <= 0 || currentValue === null || Number.isNaN(currentValue)) {
      return {
        currentValue,
        progress: baseStatus === ChallengeStatus.COMPLETED ? 100 : 0,
        status: baseStatus,
      };
    }

    const progress = Math.max(0, Math.min(100, Math.round((currentValue / target) * 100)));

    if (progress >= 100) {
      return {
        currentValue,
        progress: 100,
        status: ChallengeStatus.COMPLETED,
      };
    }

    if (progress > 0) {
      return {
        currentValue,
        progress,
        status:
          baseStatus === ChallengeStatus.CANCELLED ||
          baseStatus === ChallengeStatus.EXPIRED
            ? baseStatus
            : ChallengeStatus.IN_PROGRESS,
      };
    }

    return {
      currentValue,
      progress: 0,
      status: baseStatus,
    };
  }

  private studentNeedsAttention(student: {
    latestPeriodStatus: MonthlyMetricPeriodStatus | null;
    attentionLevel: string | null;
  }) {
    return (
      student.latestPeriodStatus === null ||
      student.attentionLevel === 'RED' ||
      student.attentionLevel === 'YELLOW'
    );
  }

  private buildMentorRiskSummary(params: {
    latestScore: {
      score: number;
      level: string;
      reasonNoMetrics: boolean;
      reasonIncomeDrop: boolean;
      reasonLeadsDrop: boolean;
      reasonClosuresDrop: boolean;
      reasonGoalsMissed: boolean;
      reasonInactivity: boolean;
    } | null;
    latestPeriod: {
      month: number;
      year: number;
      values: Array<{
        numberValue: unknown;
        originalAmount: unknown;
        usdAmount: unknown;
        metricDefinition: { slug: string };
      }>;
    } | null;
    previousPeriod: {
      month: number;
      year: number;
      values: Array<{
        numberValue: unknown;
        originalAmount: unknown;
        usdAmount: unknown;
        metricDefinition: { slug: string };
      }>;
    } | null;
    metricLabels: {
      revenue: string;
      leads: string;
      closures: string;
    };
    trackedMetricSlugs: {
      revenue: string;
      leads: string;
      closures: string;
    };
  }) {
    const { latestScore, latestPeriod, previousPeriod, metricLabels, trackedMetricSlugs } =
      params;

    if (!latestScore) {
      return {
        headline: 'Sin analisis reciente',
        items: ['Todavia no hay score de seguimiento calculado para este alumno.'],
      };
    }

    const items: string[] = [];

    if (latestScore.reasonNoMetrics) {
      items.push('No cargo metricas en el ultimo periodo mensual.');
    }

    if (latestScore.reasonIncomeDrop) {
      items.push(
        this.buildMetricDropCopy(
          metricLabels.revenue,
          latestPeriod,
          previousPeriod,
          trackedMetricSlugs.revenue,
        ),
      );
    }

    if (latestScore.reasonLeadsDrop) {
      items.push(
        this.buildMetricDropCopy(
          metricLabels.leads,
          latestPeriod,
          previousPeriod,
          trackedMetricSlugs.leads,
        ),
      );
    }

    if (latestScore.reasonClosuresDrop) {
      items.push(
        this.buildMetricDropCopy(
          metricLabels.closures,
          latestPeriod,
          previousPeriod,
          trackedMetricSlugs.closures,
        ),
      );
    }

    if (latestScore.reasonGoalsMissed) {
      items.push('Tiene objetivos vencidos o incumplidos que requieren seguimiento.');
    }

    if (latestScore.reasonInactivity) {
      items.push('Detectamos inactividad o un periodo en borrador sin actualizar.');
    }

    if (items.length === 0) {
      return {
        headline:
          latestScore.level === 'GREEN'
            ? 'Seguimiento saludable'
            : `Seguimiento ${latestScore.level.toLowerCase()}`,
        items: ['No hay alertas especificas activas en este momento.'],
      };
    }

    return {
      headline:
        latestScore.level === 'RED'
          ? 'Riesgo alto'
          : latestScore.level === 'YELLOW'
            ? 'Riesgo moderado'
            : 'Seguimiento activo',
      items,
    };
  }

  private buildMetricDropCopy(
    label: string,
    latestPeriod: {
      month: number;
      year: number;
      values: Array<{
        numberValue: unknown;
        originalAmount: unknown;
        usdAmount: unknown;
        metricDefinition: { slug: string };
      }>;
    } | null,
    previousPeriod: {
      month: number;
      year: number;
      values: Array<{
        numberValue: unknown;
        originalAmount: unknown;
        usdAmount: unknown;
        metricDefinition: { slug: string };
      }>;
    } | null,
    slug: string,
  ) {
    const currentValue = latestPeriod
      ? this.getMetricNumericValue(latestPeriod.values, slug)
      : null;
    const previousValue = previousPeriod
      ? this.getMetricNumericValue(previousPeriod.values, slug)
      : null;

    if (currentValue === null || previousValue === null) {
      return `${label} viene en baja respecto al periodo anterior.`;
    }

    return `${label} bajo de ${this.formatMetricValue(previousValue)} a ${this.formatMetricValue(
      currentValue,
    )} frente al periodo anterior.`;
  }

  private formatMetricValue(value: number) {
    if (Number.isInteger(value)) {
      return String(value);
    }

    return value.toFixed(2);
  }

  private async getTrackedMetrics() {
    const settings = await this.adminSettingsService.getSettings();
    const revenueMetricSlug = settings.metrics.revenueMetricSlug;
    const leadsMetricSlug = settings.metrics.leadsMetricSlug;
    const closuresMetricSlug = settings.metrics.closuresMetricSlug;
    const slugs = [...new Set([revenueMetricSlug, leadsMetricSlug, closuresMetricSlug])];
    const definitions = await this.prisma.metricDefinition.findMany({
      where: {
        slug: {
          in: slugs,
        },
      },
      select: {
        slug: true,
        name: true,
      },
    });
    const definitionBySlug = new Map(
      definitions.map((definition) => [definition.slug, definition.name]),
    );

    return {
      revenueMetricSlug,
      leadsMetricSlug,
      closuresMetricSlug,
      labels: {
        revenue: definitionBySlug.get(revenueMetricSlug) ?? 'Ingresos',
        leads: definitionBySlug.get(leadsMetricSlug) ?? 'Consultas',
        closures: definitionBySlug.get(closuresMetricSlug) ?? 'Cierres',
      },
    };
  }
}
