import { NotFoundException } from '@nestjs/common';
import { CurrencyService } from './currency.service';

describe('CurrencyService', () => {
  it('prefers synced non-seed rates over newer seed rows', async () => {
    const prisma = {
      currency: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'usd-id', code: 'USD' }),
      },
      exchangeRate: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'seed-rate',
            fromCurrencyId: 'ars-id',
            toCurrencyId: 'usd-id',
            rate: 0.00095,
            effectiveDate: new Date('2026-03-01T00:00:00.000Z'),
            source: 'seed',
          })
          .mockResolvedValueOnce({
            id: 'frankfurter-rate',
            fromCurrencyId: 'ars-id',
            toCurrencyId: 'usd-id',
            rate: 0.00073,
            effectiveDate: new Date('2026-02-27T00:00:00.000Z'),
            source: 'Frankfurter 2026-02-27',
          }),
      },
      conversionSnapshot: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'snapshot-id' }),
      },
    };
    const service = new CurrencyService(prisma as never);
    const syncSpy = jest
      .spyOn(service, 'syncUsdRates')
      .mockResolvedValue([]);

    const result = await service.convertToUsd({
      fromCurrencyId: 'ars-id',
      amount: 100000,
      effectiveDate: new Date('2026-03-01T00:00:00.000Z'),
    });

    expect(syncSpy).toHaveBeenCalledWith({
      effectiveDate: new Date('2026-03-01T00:00:00.000Z'),
    });
    expect(prisma.exchangeRate.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          source: { not: 'seed' },
        }),
      }),
    );
    expect(prisma.conversionSnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        exchangeRateId: 'frankfurter-rate',
        rate: 0.00073,
        source: 'Frankfurter 2026-02-27',
      }),
    });
    expect(result).toEqual({
      usdAmount: 73,
      conversionSnapshotId: 'snapshot-id',
    });
  });

  it('throws when USD currency is missing', async () => {
    const prisma = {
      currency: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new CurrencyService(prisma as never);

    await expect(
      service.convertToUsd({
        fromCurrencyId: 'ars-id',
        amount: 1,
        effectiveDate: new Date('2026-03-01T00:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
