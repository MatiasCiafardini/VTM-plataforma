import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateExchangeRateDto {
  @ApiProperty()
  @IsString()
  fromCurrencyId!: string;

  @ApiProperty()
  @IsString()
  toCurrencyId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  rate!: number;

  @ApiProperty({ example: '2026-03-25T00:00:00.000Z' })
  @IsDateString()
  effectiveDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;
}
