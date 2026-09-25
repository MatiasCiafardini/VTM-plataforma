import {
  MetricValueType,
  MonthlyMetricPeriodStatus,
  UserRole,
} from '@prisma/client';
import { MetricValuesService } from './metric-values.service';

describe('MetricValuesService', () => {
  it('converts currency metrics using the end of the reported month', async () => {
    const prisma = {
      metricValue: {
        upsert: jest.fn().mockResolvedValue(undefined),
      },
      monthlyMetricPeriod: {
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    const metricPeriodsService = {
      findAccessiblePeriodByIdOrThrow: jest.fn().mockResolvedValue({
        id: 'period-1',
        studentId: 'student-1',
        month: 3,
        year: 2026,
        status: MonthlyMetricPeriodStatus.DRAFT,
      }),
    };
    const metricDefinitionsService = {
      findByIdOrThrow: jest.fn().mockResolvedValue({
        id: 'metric-1',
        name: 'Ingresos',
        valueType: MetricValueType.CURRENCY,
        isMonetary: true,
      }),
    };
    const currencyService = {
      ensureCurrencyExists: jest.fn().mockResolvedValue(undefined),
      convertToUsd: jest.fn().mockResolvedValue({
        usdAmount: 73,
        conversionSnapshotId: 'snapshot-1',
      }),
    };
    const service = new MetricValuesService(
      prisma as never,
      metricPeriodsService as never,
      metricDefinitionsService as never,
      currencyService as never,
    );

    await service.upsertValues(
      'period-1',
      {
        values: [
          {
            metricDefinitionId: 'metric-1',
            originalAmount: 100000,
            originalCurrencyId: 'ars-id',
          },
        ],
      },
      {
        sub: 'user-1',
        email: 'student@example.com',
        role: UserRole.STUDENT,
      },
    );

    expect(currencyService.convertToUsd).toHaveBeenCalledWith({
      fromCurrencyId: 'ars-id',
      amount: 100000,
      effectiveDate: new Date('2026-03-31T23:59:59.999Z'),
    });
    expect(prisma.metricValue.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          usdAmount: 73,
          conversionSnapshotId: 'snapshot-1',
        }),
        create: expect.objectContaining({
          usdAmount: 73,
          conversionSnapshotId: 'snapshot-1',
        }),
      }),
    );
  });
});


describe('submitted period editing', () => {
  const now = new Date('2026-09-25T12:00:00Z');
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(now); });
  afterEach(() => jest.useRealTimers());

  it.each([
    ['three days ago', '2026-09-22T12:00:00Z', true],
    ['just before deadline', '2026-09-10T12:00:00.001Z', true],
    ['exact deadline', '2026-09-10T12:00:00Z', false],
    ['expired', '2026-09-01T12:00:00Z', false],
  ])('%s', async (_label, sentAt, allowed) => {
    const period = { id: 'p', studentId: 's', month: 8, year: 2026,
      status: MonthlyMetricPeriodStatus.CLOSED,
      submittedAt: new Date(sentAt), closedAt: new Date(sentAt) };
    const prisma = { monthlyMetricPeriod: { update: jest.fn() }, metricValue: { upsert: jest.fn() } };
    const periods = { findAccessiblePeriodByIdOrThrow: jest.fn().mockResolvedValue(period),
      refreshPeriodProgress: jest.fn().mockResolvedValue(undefined) };
    const service = new MetricValuesService(prisma as never, periods as never, {} as never, {} as never);
    const result = service.upsertValues('p', { values: [] },
      { sub: 'u', email: 's@example.com', role: UserRole.STUDENT });
    if (allowed) {
      await expect(result).resolves.toBe(period);
      expect(prisma.monthlyMetricPeriod.update).toHaveBeenCalledWith({ where: { id: 'p' }, data: { updatedByUserId: 'u' } });
      expect(periods.refreshPeriodProgress).toHaveBeenCalledWith(period);
    } else {
      await expect(result).rejects.toThrow('15');
      expect(prisma.monthlyMetricPeriod.update).not.toHaveBeenCalled();
      expect(periods.refreshPeriodProgress).not.toHaveBeenCalled();
    }
  });
});
