import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConversionSnapshotDto } from './dto/create-conversion-snapshot.dto';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';

@Injectable()
export class CurrencyService {
  private static readonly USD_CODE = 'USD';
  private static readonly SEED_SOURCE = 'seed';
  private static readonly FRANKFURTER_API_BASE_URL =
    process.env.FRANKFURTER_API_BASE_URL ?? 'https://api.frankfurter.dev/v2';

  constructor(private readonly prisma: PrismaService) {}

  async createCurrency(dto: CreateCurrencyDto) {
    const existing = await this.prisma.currency.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException('Currency already exists');
    }

    return this.prisma.currency.create({
      data: {
        code: dto.code.toUpperCase(),
        name: dto.name,
        symbol: dto.symbol,
        decimals: dto.decimals ?? 2,
        isActive: dto.isActive ?? true,
      },
    });
  }

  listCurrencies() {
    return this.prisma.currency.findMany({
      orderBy: [{ code: 'asc' }],
    });
  }

  async syncUsdRates(params?: { effectiveDate?: Date }) {
    const effectiveDate = params?.effectiveDate ?? new Date();
    const usd = await this.prisma.currency.findUnique({
      where: { code: CurrencyService.USD_CODE },
    });

    if (!usd) {
      throw new NotFoundException('USD currency is not configured');
    }

    const activeCurrencies = await this.prisma.currency.findMany({
      where: {
        isActive: true,
        code: {
          not: CurrencyService.USD_CODE,
        },
      },
      orderBy: [{ code: 'asc' }],
    });

    if (activeCurrencies.length === 0) {
      return [];
    }

    const requestedCodes = activeCurrencies
      .map((currency) => currency.code)
      .join(',');
    const requestDate = effectiveDate.toISOString().slice(0, 10);
    const response = await fetch(
      `${CurrencyService.FRANKFURTER_API_BASE_URL}/rates?base=USD&quotes=${requestedCodes}&date=${requestDate}`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new NotFoundException(
        'No pudimos sincronizar las tasas de cambio externas',
      );
    }

    const payload = (await response.json()) as Array<{
      date: string;
      base: string;
      quote: string;
      rate: number;
    }>;

    const ratesByQuote = new Map(payload.map((item) => [item.quote, item]));
    const syncedRates: Awaited<
      ReturnType<CurrencyService['listExchangeRates']>
    > = [];

    for (const currency of activeCurrencies) {
      const externalRate = ratesByQuote.get(currency.code);

      if (!externalRate || !externalRate.rate) {
        continue;
      }

      const rateToUsd = 1 / Number(externalRate.rate);
      const syncedRate = await this.prisma.exchangeRate.upsert({
        where: {
          fromCurrencyId_toCurrencyId_effectiveDate: {
            fromCurrencyId: currency.id,
            toCurrencyId: usd.id,
            effectiveDate: new Date(`${externalRate.date}T00:00:00.000Z`),
          },
        },
        update: {
          rate: rateToUsd,
          source: `Frankfurter ${externalRate.date}`,
        },
        create: {
          fromCurrencyId: currency.id,
          toCurrencyId: usd.id,
          rate: rateToUsd,
          effectiveDate: new Date(`${externalRate.date}T00:00:00.000Z`),
          source: `Frankfurter ${externalRate.date}`,
        },
        include: {
          fromCurrency: true,
          toCurrency: true,
        },
      });

      syncedRates.push(syncedRate);
    }

    return syncedRates;
  }

  async createExchangeRate(dto: CreateExchangeRateDto) {
    await this.ensureCurrencyExists(dto.fromCurrencyId);
    await this.ensureCurrencyExists(dto.toCurrencyId);

    return this.prisma.exchangeRate.upsert({
      where: {
        fromCurrencyId_toCurrencyId_effectiveDate: {
          fromCurrencyId: dto.fromCurrencyId,
          toCurrencyId: dto.toCurrencyId,
          effectiveDate: new Date(dto.effectiveDate),
        },
      },
      update: {
        rate: dto.rate,
        source: dto.source,
      },
      create: {
        fromCurrencyId: dto.fromCurrencyId,
        toCurrencyId: dto.toCurrencyId,
        rate: dto.rate,
        effectiveDate: new Date(dto.effectiveDate),
        source: dto.source,
      },
      include: {
        fromCurrency: true,
        toCurrency: true,
      },
    });
  }

  listExchangeRates() {
    return this.prisma.exchangeRate.findMany({
      where: {
        source: {
          not: CurrencyService.SEED_SOURCE,
        },
      },
      include: {
        fromCurrency: true,
        toCurrency: true,
      },
      orderBy: [{ effectiveDate: 'desc' }],
    });
  }

  async createConversionSnapshot(dto: CreateConversionSnapshotDto) {
    await this.ensureCurrencyExists(dto.fromCurrencyId);
    await this.ensureCurrencyExists(dto.toCurrencyId);

    if (dto.exchangeRateId) {
      await this.ensureExchangeRateExists(dto.exchangeRateId);
    }

    return this.prisma.conversionSnapshot.create({
      data: {
        exchangeRateId: dto.exchangeRateId,
        fromCurrencyId: dto.fromCurrencyId,
        toCurrencyId: dto.toCurrencyId,
        rate: dto.rate,
        snapshotDate: new Date(dto.snapshotDate),
        source: dto.source,
      },
      include: {
        fromCurrency: true,
        toCurrency: true,
        exchangeRate: true,
      },
    });
  }

  listConversionSnapshots() {
    return this.prisma.conversionSnapshot.findMany({
      include: {
        fromCurrency: true,
        toCurrency: true,
        exchangeRate: true,
      },
      orderBy: [{ snapshotDate: 'desc' }],
    });
  }

  async convertToUsd(params: {
    fromCurrencyId: string;
    amount: number;
    effectiveDate: Date;
  }) {
    const usd = await this.prisma.currency.findUnique({
      where: { code: CurrencyService.USD_CODE },
    });

    if (!usd) {
      throw new NotFoundException('USD currency is not configured');
    }

    if (params.fromCurrencyId === usd.id) {
      const snapshot = await this.prisma.conversionSnapshot.create({
        data: {
          fromCurrencyId: usd.id,
          toCurrencyId: usd.id,
          rate: 1,
          snapshotDate: params.effectiveDate,
          source: 'identity',
        },
      });

      return {
        usdAmount: params.amount,
        conversionSnapshotId: snapshot.id,
      };
    }

    const exactExchangeRate = await this.prisma.exchangeRate.findFirst({
      where: {
        fromCurrencyId: params.fromCurrencyId,
        toCurrencyId: usd.id,
        effectiveDate: params.effectiveDate,
      },
      orderBy: [{ effectiveDate: 'desc' }],
    });

    if (
      !exactExchangeRate ||
      exactExchangeRate.source === CurrencyService.SEED_SOURCE
    ) {
      await this.syncUsdRates({
        effectiveDate: params.effectiveDate,
      });
    }

    let exchangeRate = await this.prisma.exchangeRate.findFirst({
      where: {
        fromCurrencyId: params.fromCurrencyId,
        toCurrencyId: usd.id,
        effectiveDate: {
          lte: params.effectiveDate,
        },
        source: {
          not: CurrencyService.SEED_SOURCE,
        },
      },
      orderBy: [{ effectiveDate: 'desc' }],
    });

    if (!exchangeRate) {
      exchangeRate = await this.prisma.exchangeRate.findFirst({
        where: {
          fromCurrencyId: params.fromCurrencyId,
          toCurrencyId: usd.id,
          effectiveDate: {
            lte: params.effectiveDate,
          },
        },
        orderBy: [{ effectiveDate: 'desc' }],
      });
    }

    if (!exchangeRate) {
      throw new NotFoundException(
        'No exchange rate found for the provided currency and date',
      );
    }

    const snapshot = await this.prisma.conversionSnapshot.create({
      data: {
        exchangeRateId: exchangeRate.id,
        fromCurrencyId: exchangeRate.fromCurrencyId,
        toCurrencyId: exchangeRate.toCurrencyId,
        rate: exchangeRate.rate,
        snapshotDate: params.effectiveDate,
        source: exchangeRate.source,
      },
    });

    return {
      usdAmount: Number(params.amount) * Number(exchangeRate.rate),
      conversionSnapshotId: snapshot.id,
    };
  }

  async ensureCurrencyExists(currencyId: string) {
    const currency = await this.prisma.currency.findUnique({
      where: { id: currencyId },
    });

    if (!currency) {
      throw new NotFoundException('Currency not found');
    }

    return currency;
  }

  private async ensureExchangeRateExists(exchangeRateId: string) {
    const exchangeRate = await this.prisma.exchangeRate.findUnique({
      where: { id: exchangeRateId },
    });

    if (!exchangeRate) {
      throw new NotFoundException('Exchange rate not found');
    }

    return exchangeRate;
  }
}
