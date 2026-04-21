import { MetricValueType, MonthlyMetricPeriodStatus, UserRole } from '@prisma/client';
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
      findAccessiblePeriodByIdOrThrow: jest
        .fn()
        .mockResolvedValue({
          id: 'period-1',
          studentId: 'student-1',
          month: 3,
          year: 2026,
          status: MonthlyMetricPeriodStatus.DRAFT,
        }),
    };
    const metricDefinitionsService = {
      findByIdOrThrow: jest
        .fn()
        .mockResolvedValue({
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
