import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateConversionSnapshotDto {
  @ApiProperty()
  @IsString()
  fromCurrencyId!: string;

  @ApiProperty()
  @IsString()
  toCurrencyId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exchangeRateId?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  rate!: number;

  @ApiProperty()
  @IsDateString()
  snapshotDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;
}
