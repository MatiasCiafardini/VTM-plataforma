import { MonthlyMetricPeriodStatus } from '@prisma/client';

const EDIT_WINDOW_MS = 15 * 24 * 60 * 60 * 1000;

type EditablePeriod = {
  status: MonthlyMetricPeriodStatus;
  submittedAt: Date | null;
  closedAt: Date | null;
};

export function getPeriodEditDeadline(period: EditablePeriod): Date | null {
  if (period.status === MonthlyMetricPeriodStatus.DRAFT) return null;
  // Historical periods already retain their original submission/closure date.
  const sentAt = period.submittedAt ?? period.closedAt;
  return sentAt ? new Date(sentAt.getTime() + EDIT_WINDOW_MS) : null;
}

export function canStudentEditPeriod(period: EditablePeriod, now = new Date()) {
  if (period.status === MonthlyMetricPeriodStatus.DRAFT) return true;
  const deadline = getPeriodEditDeadline(period);
  return deadline !== null && now.getTime() < deadline.getTime();
}
