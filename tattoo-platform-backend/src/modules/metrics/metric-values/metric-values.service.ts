import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MetricValueType,
  MonthlyMetricPeriodStatus,
  UserRole,
} from '@prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { PrismaService } from '../../../prisma/prisma.service';
import { CurrencyService } from '../../currency/currency.service';
import { MetricDefinitionsService } from '../metric-definitions/metric-definitions.service';
import { MetricPeriodsService } from '../metric-periods/metric-periods.service';
import {
  MetricValueInputDto,
  UpsertMetricValuesDto,
} from './dto/upsert-metric-value.dto';

@Injectable()
export class MetricValuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricPeriodsService: MetricPeriodsService,
    private readonly metricDefinitionsService: MetricDefinitionsService,
    private readonly currencyService: CurrencyService,
  ) {}

  async upsertValues(
    periodId: string,
    dto: UpsertMetricValuesDto,
    actor: AuthenticatedUser,
  ) {
    const period =
      await this.metricPeriodsService.findAccessiblePeriodByIdOrThrow(
        periodId,
        actor,
      );

    if (actor.role === UserRole.MENTOR) {
      throw new ForbiddenException('Mentors can only view metrics');
    }

    if (
      actor.role === UserRole.STUDENT &&
      period.status !== MonthlyMetricPeriodStatus.DRAFT
    ) {
      throw new ConflictException('Students can only edit draft periods');
    }

    const ids = dto.values.map((value) => value.metricDefinitionId);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);

    if (duplicateIds.length > 0) {
      throw new ConflictException('Duplicate metric definitions were provided');
    }

    for (const value of dto.values) {
      const definition = await this.metricDefinitionsService.findByIdOrThrow(
        value.metricDefinitionId,
      );

      this.validateValueAgainstDefinition(value, definition);

      if (value.originalCurrencyId) {
        await this.currencyService.ensureCurrencyExists(
          value.originalCurrencyId,
        );
      }

      if (value.conversionSnapshotId) {
        await this.ensureConversionSnapshotExists(value.conversionSnapshotId);
      }

      let usdAmount = value.usdAmount;
      let conversionSnapshotId = value.conversionSnapshotId;

      if (definition.valueType === MetricValueType.CURRENCY) {
        const conversion = await this.currencyService.convertToUsd({
          fromCurrencyId: value.originalCurrencyId!,
          amount: value.originalAmount!,
          effectiveDate: this.getPeriodEffectiveDate(period.year, period.month),
        });

        usdAmount = conversion.usdAmount;
        conversionSnapshotId = conversion.conversionSnapshotId;
      }

      await this.prisma.metricValue.upsert({
        where: {
          periodId_metricDefinitionId: {
            periodId,
            metricDefinitionId: value.metricDefinitionId,
          },
        },
        update: {
          numberValue: value.numberValue,
          textValue: value.textValue,
          booleanValue: value.booleanValue,
          originalAmount: value.originalAmount,
          originalCurrencyId: value.originalCurrencyId,
          usdAmount,
          conversionSnapshotId,
          updatedAt: new Date(),
        },
        create: {
          periodId,
          metricDefinitionId: value.metricDefinitionId,
          numberValue: value.numberValue,
          textValue: value.textValue,
          booleanValue: value.booleanValue,
          originalAmount: value.originalAmount,
          originalCurrencyId: value.originalCurrencyId,
          usdAmount,
          conversionSnapshotId,
        },
      });
    }

    await this.prisma.monthlyMetricPeriod.update({
      where: { id: periodId },
      data: {
        updatedByUserId: actor.sub,
      },
    });

    return this.metricPeriodsService.findAccessiblePeriodByIdOrThrow(
      periodId,
      actor,
    );
  }

  async getValues(periodId: string, actor: AuthenticatedUser) {
    await this.metricPeriodsService.findAccessiblePeriodByIdOrThrow(
      periodId,
      actor,
    );

    return this.prisma.metricValue.findMany({
      where: { periodId },
      include: {
        metricDefinition: {
          include: {
            category: true,
          },
        },
        originalCurrency: true,
        conversionSnapshot: true,
      },
      orderBy: [
        { metricDefinition: { category: { sortOrder: 'asc' } } },
        { metricDefinition: { sortOrder: 'asc' } },
      ],
    });
  }

  private validateValueAgainstDefinition(
    value: MetricValueInputDto,
    definition: Awaited<
      ReturnType<MetricDefinitionsService['findByIdOrThrow']>
    >,
  ) {
    switch (definition.valueType) {
      case MetricValueType.INTEGER:
      case MetricValueType.DECIMAL:
        if (value.numberValue === undefined) {
          throw new ConflictException(
            `Metric "${definition.name}" requires numberValue`,
          );
        }
        break;
      case MetricValueType.TEXT:
        if (!value.textValue) {
          throw new ConflictException(
            `Metric "${definition.name}" requires textValue`,
          );
        }
        break;
      case MetricValueType.BOOLEAN:
        if (value.booleanValue === undefined) {
          throw new ConflictException(
            `Metric "${definition.name}" requires booleanValue`,
          );
        }
        break;
      case MetricValueType.CURRENCY:
        if (value.originalAmount === undefined || !value.originalCurrencyId) {
          throw new ConflictException(
            `Metric "${definition.name}" requires originalAmount and originalCurrencyId`,
          );
        }
        break;
      default:
        throw new ConflictException('Unsupported metric value type');
    }

    if (definition.isMonetary && !value.originalCurrencyId) {
      throw new ConflictException(
        `Metric "${definition.name}" requires originalCurrencyId`,
      );
    }
  }

  private async ensureConversionSnapshotExists(snapshotId: string) {
    const snapshot = await this.prisma.conversionSnapshot.findUnique({
      where: { id: snapshotId },
    });

    if (!snapshot) {
      throw new NotFoundException('Conversion snapshot not found');
    }
  }

  private getPeriodEffectiveDate(year: number, month: number) {
    return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  }
}
