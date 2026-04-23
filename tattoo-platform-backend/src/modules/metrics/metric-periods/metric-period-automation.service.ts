import { Injectable } from '@nestjs/common';
import {
  ChallengeStatus,
  GoalStatus,
  MonthlyMetricPeriodStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

type PeriodWithValues = Awaited<
  ReturnType<MetricPeriodAutomationService['listClosedPeriodsForStudent']>
>[number];

type MetricValueRecord = PeriodWithValues['values'][number];

@Injectable()
export class MetricPeriodAutomationService {
  constructor(private readonly prisma: PrismaService) {}

  async syncStudentProgress(studentId: string) {
    const [periods, metricDefinitions, challenges, studentGoals] =
      await Promise.all([
        this.listClosedPeriodsForStudent(studentId),
        this.prisma.metricDefinition.findMany({
          where: {
            slug: {
              in: [
                'porcentaje-seguimiento',
                'conversaciones-acumuladas',
                'nuevos-seguidores-mes',
                'seguidores-ganados-acumulados',
                'tasa-de-cierre',
                'crecimiento-conversaciones-mensual',
                'meses-consecutivos-creciendo',
                'meses-activos-consecutivos',
                'meses-consecutivos-sobre-meta',
                'cierres-acumulados',
                'cierres-recurrentes-acumulados',
                'ingresos-acumulados',
                'crecimiento-ingresos-mensual',
                'meta-mensual-alcanzada',
                'mejor-mes-carrera',
              ],
            },
          },
        }),
        this.prisma.challenge.findMany({
          where: {
            isActive: true,
            metricDefinitionId: {
              not: null,
            },
            targetValue: {
              not: null,
            },
          },
          include: {
            metricDefinition: true,
          },
        }),
        this.prisma.studentGoal.findMany({
          where: {
            studentId,
            targetValue: {
              not: null,
            },
            status: {
              not: GoalStatus.CANCELLED,
            },
          },
          orderBy: [{ createdAt: 'asc' }, { updatedAt: 'asc' }],
        }),
      ]);

    if (periods.length === 0) {
      return;
    }

    const definitionBySlug = new Map(
      metricDefinitions.map((definition) => [definition.slug, definition]),
    );
    const usdCurrency = await this.prisma.currency.findUnique({
      where: { code: 'USD' },
    });

    let cumulativeConversations = 0;
    let cumulativeClosures = 0;
    let cumulativeRecurringClosures = 0;
    let cumulativeRevenueUsd = 0;
    let previousFollowers: number | null = null;
    let firstFollowers: number | null = null;
    let previousRevenueUsd: number | null = null;
    let previousConversations: number | null = null;
    let consecutiveGrowthMonths = 0;
    let consecutiveActiveMonths = 0;
    let consecutiveGoalMonths = 0;
    let bestRevenueSoFar: number | null = null;

    for (const period of periods) {
      const valuesBySlug = this.mapValuesBySlug(period.values);
      const conversations = this.getMetricNumber(
        valuesBySlug.get('conversaciones-a-nuevos') ?? null,
      );
      const cotizaciones = this.getMetricNumber(
        valuesBySlug.get('cotizaciones') ?? null,
      );
      const closures = this.getMetricNumber(
        valuesBySlug.get('cierres-del-mes') ?? null,
      );
      const recurringClosures = this.getMetricNumber(
        valuesBySlug.get('cierres-recurrentes') ?? null,
      );
      const followers = this.getMetricNumber(
        valuesBySlug.get('seguidores-instagram-actuales') ?? null,
      );
      const revenueUsd = this.getMetricNumber(
        valuesBySlug.get('ingresos-facturacion') ?? null,
      );
      const storedFollowupPercent = this.getMetricNumberOrNull(
        valuesBySlug.get('porcentaje-seguimiento') ?? null,
      );

      cumulativeConversations += conversations;
      cumulativeClosures += closures;
      cumulativeRecurringClosures += recurringClosures;
      cumulativeRevenueUsd += revenueUsd;

      if (firstFollowers === null) {
        firstFollowers = followers;
      }

      const monthlyFollowerGrowth =
        previousFollowers === null
          ? 0
          : Math.max(0, followers - previousFollowers);
      const accumulatedFollowerGrowth =
        firstFollowers === null ? 0 : Math.max(0, followers - firstFollowers);
      const closingRate =
        cotizaciones > 0
          ? this.roundTo((closures / cotizaciones) * 100, 2)
          : 0;
      const followupPercent =
        storedFollowupPercent !== null
          ? storedFollowupPercent
          : conversations > 0
            ? this.roundTo(Math.min(100, (cotizaciones / conversations) * 100), 2)
            : 0;

      let conversationGrowth = 0;
      if (previousConversations !== null) {
        if (conversations >= previousConversations && conversations > 0) {
          conversationGrowth = Math.max(1, conversations - previousConversations);
        } else {
          conversationGrowth = conversations - previousConversations;
        }
      }

      if (previousConversations !== null && conversations > previousConversations) {
        consecutiveGrowthMonths += 1;
      } else {
        consecutiveGrowthMonths = 0;
      }

      consecutiveActiveMonths =
        conversations > 0 ? consecutiveActiveMonths + 1 : 0;

      const targetGoal = this.resolveGoalTargetForPeriod(period, studentGoals);
      const reachedGoal =
        targetGoal !== null && revenueUsd >= targetGoal ? 1 : 0;

      consecutiveGoalMonths = reachedGoal
        ? consecutiveGoalMonths + 1
        : 0;

      const isBestMonth =
        previousRevenueUsd !== null &&
        (bestRevenueSoFar === null || revenueUsd > bestRevenueSoFar)
          ? 1
          : 0;

      const revenueGrowth =
        previousRevenueUsd === null ? 0 : revenueUsd - previousRevenueUsd;

      await Promise.all([
        this.upsertNumberMetric(
          period.id,
          definitionBySlug.get('porcentaje-seguimiento')?.id,
          followupPercent,
        ),
        this.upsertNumberMetric(
          period.id,
          definitionBySlug.get('conversaciones-acumuladas')?.id,
          cumulativeConversations,
        ),
        this.upsertNumberMetric(
          period.id,
          definitionBySlug.get('nuevos-seguidores-mes')?.id,
          monthlyFollowerGrowth,
        ),
        this.upsertNumberMetric(
          period.id,
          definitionBySlug.get('seguidores-ganados-acumulados')?.id,
          accumulatedFollowerGrowth,
        ),
        this.upsertNumberMetric(
          period.id,
          definitionBySlug.get('tasa-de-cierre')?.id,
          closingRate,
        ),
        this.upsertNumberMetric(
          period.id,
          definitionBySlug.get('crecimiento-conversaciones-mensual')?.id,
          conversationGrowth,
        ),
        this.upsertNumberMetric(
          period.id,
          definitionBySlug.get('meses-consecutivos-creciendo')?.id,
          consecutiveGrowthMonths,
        ),
        this.upsertNumberMetric(
          period.id,
          definitionBySlug.get('meses-activos-consecutivos')?.id,
          consecutiveActiveMonths,
        ),
        this.upsertNumberMetric(
          period.id,
          definitionBySlug.get('meses-consecutivos-sobre-meta')?.id,
          consecutiveGoalMonths,
        ),
        this.upsertNumberMetric(
          period.id,
          definitionBySlug.get('cierres-acumulados')?.id,
          cumulativeClosures,
        ),
        this.upsertNumberMetric(
          period.id,
          definitionBySlug.get('cierres-recurrentes-acumulados')?.id,
          cumulativeRecurringClosures,
        ),
        this.upsertCurrencyMetric(
          period.id,
          definitionBySlug.get('ingresos-acumulados')?.id,
          cumulativeRevenueUsd,
          usdCurrency?.id ?? null,
        ),
        this.upsertCurrencyMetric(
          period.id,
          definitionBySlug.get('crecimiento-ingresos-mensual')?.id,
          revenueGrowth,
          usdCurrency?.id ?? null,
        ),
        this.upsertNumberMetric(
          period.id,
          definitionBySlug.get('meta-mensual-alcanzada')?.id,
          reachedGoal,
        ),
        this.upsertNumberMetric(
          period.id,
          definitionBySlug.get('mejor-mes-carrera')?.id,
          isBestMonth,
        ),
      ]);

      previousFollowers = followers;
      previousRevenueUsd = revenueUsd;
      previousConversations = conversations;
      bestRevenueSoFar =
        bestRevenueSoFar === null
          ? revenueUsd
          : Math.max(bestRevenueSoFar, revenueUsd);
    }

    const refreshedPeriods = await this.listClosedPeriodsForStudent(studentId);
    await this.syncChallenges(studentId, refreshedPeriods, challenges);
  }

  private async syncChallenges(
    studentId: string,
    periods: PeriodWithValues[],
    challenges: Array<{
      id: string;
      targetValue: unknown;
      metricDefinition: { slug: string } | null;
    }>,
  ) {
    const existingAssignments = await this.prisma.studentChallenge.findMany({
      where: {
        studentId,
      },
    });
    const assignmentByChallengeId = new Map(
      existingAssignments.map((assignment) => [assignment.challengeId, assignment]),
    );
    const latestPeriod = periods[periods.length - 1] ?? null;

    for (const challenge of challenges) {
      const metricSlug = challenge.metricDefinition?.slug ?? null;
      const targetValue =
        challenge.targetValue === null || challenge.targetValue === undefined
          ? null
          : Number(challenge.targetValue);

      if (!metricSlug || targetValue === null || Number.isNaN(targetValue)) {
        continue;
      }

      const completionPeriod =
        periods.find((period) => {
          const currentValue = this.getMetricNumber(
            this.mapValuesBySlug(period.values).get(metricSlug) ?? null,
          );

          return currentValue >= targetValue;
        }) ?? null;

      const existingAssignment = assignmentByChallengeId.get(challenge.id) ?? null;

      if (completionPeriod) {
        const completedAt =
          completionPeriod.closedAt ??
          completionPeriod.submittedAt ??
          completionPeriod.updatedAt;

        const assignment = await this.prisma.studentChallenge.upsert({
          where: {
            studentId_challengeId: {
              studentId,
              challengeId: challenge.id,
            },
          },
          update: {
            status: ChallengeStatus.COMPLETED,
          },
          create: {
            studentId,
            challengeId: challenge.id,
            status: ChallengeStatus.COMPLETED,
            assignedAt: completedAt,
          },
        });

        assignmentByChallengeId.set(challenge.id, assignment);
        continue;
      }

      if (
        existingAssignment &&
        existingAssignment.status !== ChallengeStatus.CANCELLED &&
        existingAssignment.status !== ChallengeStatus.EXPIRED
      ) {
        const latestCurrentValue =
          latestPeriod === null
            ? 0
            : this.getMetricNumber(
                this.mapValuesBySlug(latestPeriod.values).get(metricSlug) ?? null,
              );

        const nextStatus =
          latestCurrentValue > 0
            ? ChallengeStatus.IN_PROGRESS
            : ChallengeStatus.ASSIGNED;

        if (existingAssignment.status !== nextStatus) {
          const assignment = await this.prisma.studentChallenge.update({
            where: { id: existingAssignment.id },
            data: { status: nextStatus },
          });
          assignmentByChallengeId.set(challenge.id, assignment);
        }
      }
    }
  }

  private resolveGoalTargetForPeriod(
    period: {
      closedAt: Date | null;
      submittedAt: Date | null;
      updatedAt: Date;
    },
    studentGoals: Array<{
      createdAt: Date;
      targetValue: unknown;
    }>,
  ) {
    const periodDate = period.closedAt ?? period.submittedAt ?? period.updatedAt;
    const matchingGoal =
      [...studentGoals]
        .reverse()
        .find((goal) => goal.createdAt <= periodDate) ??
      studentGoals[studentGoals.length - 1] ??
      null;

    if (!matchingGoal?.targetValue) {
      return null;
    }

    return Number(matchingGoal.targetValue);
  }

  private mapValuesBySlug(values: MetricValueRecord[]) {
    return new Map(values.map((value) => [value.metricDefinition.slug, value]));
  }

  private getMetricNumber(value: MetricValueRecord | null) {
    return this.getMetricNumberOrNull(value) ?? 0;
  }

  private getMetricNumberOrNull(value: MetricValueRecord | null) {
    if (!value) {
      return null;
    }

    const candidate =
      value.usdAmount ?? value.originalAmount ?? value.numberValue ?? null;

    if (candidate === null || candidate === undefined) {
      return null;
    }

    return Number(candidate);
  }

  private async upsertNumberMetric(
    periodId: string,
    metricDefinitionId: string | undefined,
    numberValue: number,
  ) {
    if (!metricDefinitionId) {
      return;
    }

    await this.prisma.metricValue.upsert({
      where: {
        periodId_metricDefinitionId: {
          periodId,
          metricDefinitionId,
        },
      },
      update: {
        numberValue: this.toDecimal(numberValue),
        textValue: null,
        booleanValue: null,
        originalAmount: null,
        originalCurrencyId: null,
        usdAmount: null,
        conversionSnapshotId: null,
      },
      create: {
        periodId,
        metricDefinitionId,
        numberValue: this.toDecimal(numberValue),
      },
    });
  }

  private async upsertCurrencyMetric(
    periodId: string,
    metricDefinitionId: string | undefined,
    amountUsd: number,
    usdCurrencyId: string | null,
  ) {
    if (!metricDefinitionId || !usdCurrencyId) {
      return;
    }

    const decimalValue = this.toDecimal(amountUsd);

    await this.prisma.metricValue.upsert({
      where: {
        periodId_metricDefinitionId: {
          periodId,
          metricDefinitionId,
        },
      },
      update: {
        numberValue: null,
        textValue: null,
        booleanValue: null,
        originalAmount: decimalValue,
        originalCurrencyId: usdCurrencyId,
        usdAmount: decimalValue,
        conversionSnapshotId: null,
      },
      create: {
        periodId,
        metricDefinitionId,
        originalAmount: decimalValue,
        originalCurrencyId: usdCurrencyId,
        usdAmount: decimalValue,
      },
    });
  }

  private roundTo(value: number, decimals: number) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  private toDecimal(value: number) {
    if (!Number.isFinite(value)) {
      return '0';
    }

    return this.roundTo(value, 4).toFixed(4);
  }

  private listClosedPeriodsForStudent(studentId: string) {
    return this.prisma.monthlyMetricPeriod.findMany({
      where: {
        studentId,
        status: MonthlyMetricPeriodStatus.CLOSED,
      },
      include: {
        values: {
          include: {
            metricDefinition: true,
          },
        },
      },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });
  }
}
