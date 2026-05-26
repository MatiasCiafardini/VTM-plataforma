import { NestFactory } from '@nestjs/core';
import { MetricValueType } from '@prisma/client';
import { AppModule } from '../app.module';
import { AttentionScoreService } from '../modules/attention-score/attention-score.service';
import { MetricPeriodAutomationService } from '../modules/metrics/metric-periods/metric-period-automation.service';
import { PrismaService } from '../prisma/prisma.service';

function getPeriodEffectiveDate(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
}

function toDecimal(value: number, decimals = 4) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return value.toFixed(decimals);
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const prisma = app.get(PrismaService);
    const automationService = app.get(MetricPeriodAutomationService);
    const attentionScoreService = app.get(AttentionScoreService);
    const usd = await prisma.currency.findUnique({
      where: { code: 'USD' },
    });

    if (!usd) {
      throw new Error('USD currency is not configured.');
    }

    const metricValues = await prisma.metricValue.findMany({
      where: {
        metricDefinition: {
          valueType: MetricValueType.CURRENCY,
        },
        originalAmount: {
          not: null,
        },
        originalCurrencyId: {
          not: null,
        },
      },
      include: {
        metricDefinition: true,
        originalCurrency: true,
        period: {
          select: {
            id: true,
            month: true,
            year: true,
            studentId: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'asc' }],
    });

    let recalculated = 0;
    const skipped: string[] = [];

    for (const metricValue of metricValues) {
      const amount = Number(metricValue.originalAmount);
      const effectiveDate = getPeriodEffectiveDate(
        metricValue.period.year,
        metricValue.period.month,
      );

      if (!Number.isFinite(amount) || !metricValue.originalCurrencyId) {
        skipped.push(metricValue.id);
        continue;
      }

      if (metricValue.originalCurrencyId === usd.id) {
        const snapshot = await prisma.conversionSnapshot.create({
          data: {
            fromCurrencyId: usd.id,
            toCurrencyId: usd.id,
            rate: '1',
            snapshotDate: effectiveDate,
            source: 'identity',
          },
        });

        await prisma.metricValue.update({
          where: { id: metricValue.id },
          data: {
            usdAmount: toDecimal(amount),
            conversionSnapshotId: snapshot.id,
          },
        });
        recalculated += 1;
        continue;
      }

      const exchangeRate =
        (await prisma.exchangeRate.findFirst({
          where: {
            fromCurrencyId: metricValue.originalCurrencyId,
            toCurrencyId: usd.id,
            effectiveDate: {
              lte: effectiveDate,
            },
            source: {
              not: 'seed',
            },
          },
          orderBy: [{ effectiveDate: 'desc' }],
        })) ??
        (await prisma.exchangeRate.findFirst({
          where: {
            fromCurrencyId: metricValue.originalCurrencyId,
            toCurrencyId: usd.id,
            effectiveDate: {
              lte: effectiveDate,
            },
          },
          orderBy: [{ effectiveDate: 'desc' }],
        }));

      if (!exchangeRate) {
        skipped.push(
          `${metricValue.id} (${metricValue.originalCurrency?.code ?? 'unknown'})`,
        );
        continue;
      }

      const rate = Number(exchangeRate.rate);
      const usdAmount = amount * rate;
      const snapshot = await prisma.conversionSnapshot.create({
        data: {
          exchangeRateId: exchangeRate.id,
          fromCurrencyId: exchangeRate.fromCurrencyId,
          toCurrencyId: exchangeRate.toCurrencyId,
          rate: exchangeRate.rate,
          snapshotDate: effectiveDate,
          source: exchangeRate.source,
        },
      });

      await prisma.metricValue.update({
        where: { id: metricValue.id },
        data: {
          usdAmount: toDecimal(usdAmount),
          conversionSnapshotId: snapshot.id,
        },
      });
      recalculated += 1;
    }

    const students = await prisma.studentProfile.findMany({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    for (const student of students) {
      await automationService.syncStudentProgress(student.id);
      await attentionScoreService.recalculateForStudent(student.id);
    }

    console.log(
      `Currency metric recalculation completed. Recalculated ${recalculated} values for ${students.length} students.`,
    );

    if (skipped.length > 0) {
      console.warn(`Skipped ${skipped.length} values: ${skipped.join(', ')}`);
    }
  } finally {
    await app.close();
  }
}

void main();
