import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttentionLevel,
  ChallengeStatus,
  MonthlyMetricPeriodStatus,
  NotificationType,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminSettingsService } from '../admin-settings/admin-settings.service';

@Injectable()
export class NotificationsService {
  private automationSyncStartedAt = 0;
  private automationSyncPromise: Promise<void> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminSettingsService: AdminSettingsService,
  ) {}

  async listForActor(actor: AuthenticatedUser) {
    this.triggerAutomationSync();

    return this.prisma.notification.findMany({
      where: {
        OR: [{ recipientUserId: actor.sub }, { audienceRole: actor.role }],
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [{ readAt: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });
  }

  async markRead(id: string, actor: AuthenticatedUser) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (
      notification.recipientUserId !== actor.sub &&
      notification.audienceRole !== actor.role
    ) {
      throw new ForbiddenException('You cannot modify this notification');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        readAt: notification.readAt ?? new Date(),
      },
    });
  }

  async delete(id: string, actor: AuthenticatedUser) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (
      notification.recipientUserId !== actor.sub &&
      notification.audienceRole !== actor.role
    ) {
      throw new ForbiddenException('You cannot modify this notification');
    }

    return this.prisma.notification.delete({
      where: { id },
    });
  }

  async notifyRiskTransition(params: {
    studentId: string;
    studentName: string;
    score: number;
    previousLevel: AttentionLevel | null;
    nextLevel: AttentionLevel;
    monthlyMetricPeriodId: string | null;
  }) {
    const settings = await this.adminSettingsService.getSettings();

    if (
      !settings.notifications.notifyAdminsOnRisk ||
      params.nextLevel !== AttentionLevel.RED ||
      params.previousLevel === AttentionLevel.RED
    ) {
      return;
    }

    const suffix = params.monthlyMetricPeriodId ?? 'no-period';

    await this.createNotification({
      type: NotificationType.ATTENTION_RISK,
      audienceRole: UserRole.ADMIN,
      studentId: params.studentId,
      dedupeKey: `risk:admin:${params.studentId}:${suffix}`,
      title: 'Alumno en riesgo',
      message: `${params.studentName} paso a estado en riesgo con score ${params.score}.`,
      metadata: {
        studentId: params.studentId,
        previousLevel: params.previousLevel,
        nextLevel: params.nextLevel,
        score: params.score,
        monthlyMetricPeriodId: params.monthlyMetricPeriodId,
      },
    });
  }

  async syncAutomations() {
    await this.syncMonthEndReminders();
    await this.syncAchievementNotifications();
  }

  private triggerAutomationSync() {
    const now = Date.now();
    const syncIntervalMs = 1000 * 60 * 5;

    if (this.automationSyncPromise) {
      return;
    }

    if (now - this.automationSyncStartedAt < syncIntervalMs) {
      return;
    }

    this.automationSyncStartedAt = now;
    this.automationSyncPromise = this.syncAutomations()
      .catch((error: unknown) => {
        console.error('Notification automation sync failed', error);
      })
      .finally(() => {
        this.automationSyncPromise = null;
      });
  }

  private async syncMonthEndReminders() {
    const settings = await this.adminSettingsService.getSettings();
    const today = new Date();

    if (today.getDate() < settings.notifications.monthEndReminderDay) {
      return;
    }

    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const students = await this.prisma.studentProfile.findMany({
      where: {
        user: {
          status: UserStatus.ACTIVE,
        },
      },
      include: {
        user: true,
        monthlyPeriods: {
          where: {
            month,
            year,
          },
          take: 1,
        },
      },
    });

    for (const student of students) {
      const currentPeriod = student.monthlyPeriods[0] ?? null;
      const isPending =
        !currentPeriod ||
        currentPeriod.status === MonthlyMetricPeriodStatus.DRAFT;

      if (!isPending) {
        continue;
      }

      const detail = currentPeriod
        ? 'Todavia tenes pendiente enviar las metricas del mes actual.'
        : 'Todavia no se creo la carga de metricas del mes actual.';

      if (settings.notifications.remindStudentsForPendingMetrics) {
        await this.createNotification({
          type: NotificationType.METRIC_REMINDER,
          recipientUserId: student.userId,
          studentId: student.id,
          dedupeKey: `metric-reminder:student:${student.id}:${year}-${month}`,
          title: 'Recordatorio de carga mensual',
          message: detail,
          metadata: {
            studentId: student.id,
            month,
            year,
            status: currentPeriod?.status ?? null,
          },
        });
      }

      if (settings.notifications.remindAdminsForPendingMetrics) {
        await this.createNotification({
          type: NotificationType.METRIC_REMINDER,
          audienceRole: UserRole.ADMIN,
          studentId: student.id,
          dedupeKey: `metric-reminder:admin:${student.id}:${year}-${month}`,
          title: 'Carga mensual pendiente',
          message: `${student.user.firstName} ${student.user.lastName} aun no completo la carga mensual.`,
          metadata: {
            studentId: student.id,
            month,
            year,
            status: currentPeriod?.status ?? null,
          },
        });
      }
    }
  }

  private async syncAchievementNotifications() {
    const settings = await this.adminSettingsService.getSettings();
    const closedPeriods = await this.prisma.monthlyMetricPeriod.findMany({
      where: {
        status: MonthlyMetricPeriodStatus.CLOSED,
      },
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
      take: 120,
    });
    const challenges = await this.prisma.challenge.findMany({
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
    });

    for (const period of closedPeriods) {
      for (const challenge of challenges) {
        const metricValue = period.values.find(
          (value) =>
            value.metricDefinition.slug === challenge.metricDefinition?.slug,
        );
        const currentValue = metricValue
          ? Number(
              metricValue.usdAmount ??
                metricValue.originalAmount ??
                metricValue.numberValue ??
                0,
            )
          : null;
        const targetValue = challenge.targetValue
          ? Number(challenge.targetValue)
          : null;

        if (
          currentValue === null ||
          targetValue === null ||
          Number.isNaN(currentValue) ||
          currentValue < targetValue
        ) {
          continue;
        }

        const challengeAssignment =
          await this.prisma.studentChallenge.findFirst({
            where: {
              studentId: period.studentId,
              challengeId: challenge.id,
            },
          });

        if (
          challengeAssignment &&
          challengeAssignment.status !== ChallengeStatus.COMPLETED
        ) {
          await this.prisma.studentChallenge.update({
            where: { id: challengeAssignment.id },
            data: { status: ChallengeStatus.COMPLETED },
          });
        }

        if (settings.notifications.notifyStudentOnAchievement) {
          await this.createNotification({
            type: NotificationType.ACHIEVEMENT_COMPLETED,
            recipientUserId: period.student.userId,
            studentId: period.studentId,
            dedupeKey: `achievement:student:${period.studentId}:${challenge.id}:${period.id}`,
            title: 'Logro completado',
            message: `Completaste el logro "${challenge.title}".`,
            metadata: {
              studentId: period.studentId,
              challengeId: challenge.id,
              periodId: period.id,
            },
          });
        }

        if (settings.notifications.notifyAdminsOnAchievement) {
          await this.createNotification({
            type: NotificationType.ACHIEVEMENT_COMPLETED,
            audienceRole: UserRole.ADMIN,
            studentId: period.studentId,
            dedupeKey: `achievement:admin:${period.studentId}:${challenge.id}:${period.id}`,
            title: 'Logro completado por alumno',
            message: `${period.student.user.firstName} ${period.student.user.lastName} completo el logro "${challenge.title}".`,
            metadata: {
              studentId: period.studentId,
              challengeId: challenge.id,
              periodId: period.id,
            },
          });
        }
      }
    }
  }

  async notifyNewsPublished(params: { newsId: string; newsTitle: string }) {
    const students = await this.prisma.user.findMany({
      where: { status: UserStatus.ACTIVE, role: UserRole.STUDENT },
      select: { id: true },
    });

    for (const student of students) {
      await this.createNotification({
        type: NotificationType.NEWS_PUBLISHED,
        recipientUserId: student.id,
        title: 'Nueva novedad publicada',
        message: params.newsTitle,
        dedupeKey: `news:${params.newsId}:${student.id}`,
        metadata: { newsId: params.newsId },
      });
    }
  }

  private async createNotification(data: {
    type: NotificationType;
    title: string;
    message: string;
    audienceRole?: UserRole;
    recipientUserId?: string;
    studentId?: string;
    dedupeKey?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    try {
      await this.prisma.notification.create({
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }

      throw error;
    }
  }
}
