import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ConvertAmountDto } from './dto/convert-amount.dto';
import { CreateConversionSnapshotDto } from './dto/create-conversion-snapshot.dto';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { SyncExchangeRatesDto } from './dto/sync-exchange-rates.dto';
import { CurrencyService } from './currency.service';

@ApiTags('currency')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('currencies')
  @Roles(UserRole.ADMIN, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({ summary: 'List supported currencies' })
  listCurrencies() {
    return this.currencyService.listCurrencies();
  }

  @Post('currencies')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a currency' })
  createCurrency(@Body() dto: CreateCurrencyDto) {
    return this.currencyService.createCurrency(dto);
  }

  @Get('exchange-rates')
  @Roles(UserRole.ADMIN, UserRole.MENTOR)
  @ApiOperation({ summary: 'List exchange rates' })
  listExchangeRates() {
    return this.currencyService.listExchangeRates();
  }

  @Post('exchange-rates')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create or update an exchange rate' })
  createExchangeRate(@Body() dto: CreateExchangeRateDto) {
    return this.currencyService.createExchangeRate(dto);
  }

  @Post('exchange-rates/sync')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Sync active currency rates against USD from the configured provider',
  })
  syncExchangeRates(@Body() dto: SyncExchangeRatesDto) {
    return this.currencyService.syncUsdRates({
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date(),
    });
  }

  @Get('conversion-snapshots')
  @Roles(UserRole.ADMIN, UserRole.MENTOR)
  @ApiOperation({ summary: 'List conversion snapshots' })
  listConversionSnapshots() {
    return this.currencyService.listConversionSnapshots();
  }

  @Post('conversion-snapshots')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a conversion snapshot manually' })
  createConversionSnapshot(@Body() dto: CreateConversionSnapshotDto) {
    return this.currencyService.createConversionSnapshot(dto);
  }

  @Post('convert-to-usd')
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @ApiOperation({
    summary:
      'Convert a local amount to USD using the latest valid exchange rate',
  })
  convertToUsd(@Body() dto: ConvertAmountDto) {
    return this.currencyService.convertToUsd({
      fromCurrencyId: dto.fromCurrencyId,
      amount: dto.amount,
      effectiveDate: new Date(dto.effectiveDate),
    });
  }
}
