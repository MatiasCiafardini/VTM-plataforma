import { MonthlyMetricPeriodStatus as Status } from '@prisma/client';
import { canStudentEditPeriod, getPeriodEditDeadline } from './period-edit-window';

describe('period edit window', () => {
  const submittedAt = new Date('2026-09-22T12:00:00Z');
  const now = new Date('2026-09-25T12:00:00Z');
  it('uses original submission even if closed later', () => {
    const period = { status: Status.CLOSED, submittedAt, closedAt: now };
    expect(getPeriodEditDeadline(period)).toEqual(new Date('2026-10-07T12:00:00Z'));
    expect(canStudentEditPeriod(period, now)).toBe(true);
  });
  it('supports historical closed periods without a submission date', () => {
    expect(canStudentEditPeriod({ status: Status.CLOSED, submittedAt: null, closedAt: submittedAt }, now)).toBe(true);
  });
  it('allows submitted periods and drafts', () => {
    expect(canStudentEditPeriod({ status: Status.SUBMITTED, submittedAt, closedAt: null }, now)).toBe(true);
    expect(canStudentEditPeriod({ status: Status.DRAFT, submittedAt: null, closedAt: null }, now)).toBe(true);
  });
  it('does not unlock undated closed periods', () => {
    expect(canStudentEditPeriod({ status: Status.CLOSED, submittedAt: null, closedAt: null }, now)).toBe(false);
  });
});
