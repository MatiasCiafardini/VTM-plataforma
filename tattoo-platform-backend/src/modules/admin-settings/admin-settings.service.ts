import { Injectable } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type AdminPlatformSettings = {
  userOperations: {
    defaultStudentStatus: UserStatus;
    defaultMentorStatus: UserStatus;
    inactivityThresholdDays: number;
    goodStandingLabel: string;
    riskStandingLabel: string;
    studentRegistrationCode: string;
  };
  metrics: {
    revenueMetricSlug: string;
    leadsMetricSlug: string;
    closuresMetricSlug: string;
    noMetricsWeight: number;
    incomeDropWeight: number;
    leadsDropWeight: number;
    closuresDropWeight: number;
    goalsMissedWeight: number;
    inactivityWeight: number;
    warningThreshold: number;
    riskThreshold: number;
    inactivityDays: number;
    staleDraftDays: number;
  };
  notifications: {
    monthEndReminderDay: number;
    remindStudentsForPendingMetrics: boolean;
    remindAdminsForPendingMetrics: boolean;
    notifyStudentOnAchievement: boolean;
    notifyAdminsOnAchievement: boolean;
    notifyAdminsOnRisk: boolean;
  };
};

const SETTINGS_KEY = 'platform-config';

const DEFAULT_SETTINGS: AdminPlatformSettings = {
  userOperations: {
    defaultStudentStatus: UserStatus.ACTIVE,
    defaultMentorStatus: UserStatus.ACTIVE,
    inactivityThresholdDays: 45,
    goodStandingLabel: 'Bueno',
    riskStandingLabel: 'En riesgo',
    studentRegistrationCode: 'VMT2026',
  },
  metrics: {
    revenueMetricSlug: 'ingresos-facturacion',
    leadsMetricSlug: 'consultas-mensuales',
    closuresMetricSlug: 'cierres-del-mes',
    noMetricsWeight: 40,
    incomeDropWeight: 20,
    leadsDropWeight: 15,
    closuresDropWeight: 15,
    goalsMissedWeight: 10,
    inactivityWeight: 20,
    warningThreshold: 20,
    riskThreshold: 40,
    inactivityDays: 45,
    staleDraftDays: 30,
  },
  notifications: {
    monthEndReminderDay: 25,
    remindStudentsForPendingMetrics: true,
    remindAdminsForPendingMetrics: true,
    notifyStudentOnAchievement: true,
    notifyAdminsOnAchievement: true,
    notifyAdminsOnRisk: true,
  },
};

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function readNumber(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function readString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readUserStatus(value: unknown, fallback: UserStatus) {
  return value === UserStatus.ACTIVE || value === UserStatus.INACTIVE
    ? value
    : fallback;
}

@Injectable()
export class AdminSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const stored = await this.prisma.adminSetting.findUnique({
      where: { key: SETTINGS_KEY },
    });

    return this.normalizeSettings(stored?.value);
  }

  async updateSettings(nextValue: unknown) {
    const normalized = this.normalizeSettings(nextValue);

    await this.prisma.adminSetting.upsert({
      where: { key: SETTINGS_KEY },
      update: {
        value: normalized,
      },
      create: {
        key: SETTINGS_KEY,
        value: normalized,
      },
    });

    return normalized;
  }

  async resolveDefaultStatus(role: UserRole, explicitStatus?: UserStatus) {
    if (explicitStatus) {
      return explicitStatus;
    }

    const settings = await this.getSettings();

    if (role === UserRole.MENTOR) {
      return settings.userOperations.defaultMentorStatus;
    }

    if (role === UserRole.STUDENT) {
      return settings.userOperations.defaultStudentStatus;
    }

    return UserStatus.ACTIVE;
  }

  private normalizeSettings(value: unknown): AdminPlatformSettings {
    const raw = asRecord(value);
    const userOperations = asRecord(raw.userOperations);
    const metrics = asRecord(raw.metrics);
    const notifications = asRecord(raw.notifications);

    return {
      userOperations: {
        defaultStudentStatus: readUserStatus(
          userOperations.defaultStudentStatus,
          DEFAULT_SETTINGS.userOperations.defaultStudentStatus,
        ),
        defaultMentorStatus: readUserStatus(
          userOperations.defaultMentorStatus,
          DEFAULT_SETTINGS.userOperations.defaultMentorStatus,
        ),
        inactivityThresholdDays: readNumber(
          userOperations.inactivityThresholdDays,
          DEFAULT_SETTINGS.userOperations.inactivityThresholdDays,
        ),
        goodStandingLabel: readString(
          userOperations.goodStandingLabel,
          DEFAULT_SETTINGS.userOperations.goodStandingLabel,
        ),
        riskStandingLabel: readString(
          userOperations.riskStandingLabel,
          DEFAULT_SETTINGS.userOperations.riskStandingLabel,
        ),
        studentRegistrationCode: readString(
          userOperations.studentRegistrationCode,
          DEFAULT_SETTINGS.userOperations.studentRegistrationCode,
        ),
      },
      metrics: {
        revenueMetricSlug: readString(
          metrics.revenueMetricSlug,
          DEFAULT_SETTINGS.metrics.revenueMetricSlug,
        ),
        leadsMetricSlug: readString(
          metrics.leadsMetricSlug,
          DEFAULT_SETTINGS.metrics.leadsMetricSlug,
        ),
        closuresMetricSlug: readString(
          metrics.closuresMetricSlug,
          DEFAULT_SETTINGS.metrics.closuresMetricSlug,
        ),
        noMetricsWeight: readNumber(
          metrics.noMetricsWeight,
          DEFAULT_SETTINGS.metrics.noMetricsWeight,
        ),
        incomeDropWeight: readNumber(
          metrics.incomeDropWeight,
          DEFAULT_SETTINGS.metrics.incomeDropWeight,
        ),
        leadsDropWeight: readNumber(
          metrics.leadsDropWeight,
          DEFAULT_SETTINGS.metrics.leadsDropWeight,
        ),
        closuresDropWeight: readNumber(
          metrics.closuresDropWeight,
          DEFAULT_SETTINGS.metrics.closuresDropWeight,
        ),
        goalsMissedWeight: readNumber(
          metrics.goalsMissedWeight,
          DEFAULT_SETTINGS.metrics.goalsMissedWeight,
        ),
        inactivityWeight: readNumber(
          metrics.inactivityWeight,
          DEFAULT_SETTINGS.metrics.inactivityWeight,
        ),
        warningThreshold: readNumber(
          metrics.warningThreshold,
          DEFAULT_SETTINGS.metrics.warningThreshold,
        ),
        riskThreshold: readNumber(
          metrics.riskThreshold,
          DEFAULT_SETTINGS.metrics.riskThreshold,
        ),
        inactivityDays: readNumber(
          metrics.inactivityDays,
          DEFAULT_SETTINGS.metrics.inactivityDays,
        ),
        staleDraftDays: readNumber(
          metrics.staleDraftDays,
          DEFAULT_SETTINGS.metrics.staleDraftDays,
        ),
      },
      notifications: {
        monthEndReminderDay: readNumber(
          notifications.monthEndReminderDay,
          DEFAULT_SETTINGS.notifications.monthEndReminderDay,
        ),
        remindStudentsForPendingMetrics: readBoolean(
          notifications.remindStudentsForPendingMetrics,
          DEFAULT_SETTINGS.notifications.remindStudentsForPendingMetrics,
        ),
        remindAdminsForPendingMetrics: readBoolean(
          notifications.remindAdminsForPendingMetrics,
          DEFAULT_SETTINGS.notifications.remindAdminsForPendingMetrics,
        ),
        notifyStudentOnAchievement: readBoolean(
          notifications.notifyStudentOnAchievement,
          DEFAULT_SETTINGS.notifications.notifyStudentOnAchievement,
        ),
        notifyAdminsOnAchievement: readBoolean(
          notifications.notifyAdminsOnAchievement,
          DEFAULT_SETTINGS.notifications.notifyAdminsOnAchievement,
        ),
        notifyAdminsOnRisk: readBoolean(
          notifications.notifyAdminsOnRisk,
          DEFAULT_SETTINGS.notifications.notifyAdminsOnRisk,
        ),
      },
    };
  }
}
