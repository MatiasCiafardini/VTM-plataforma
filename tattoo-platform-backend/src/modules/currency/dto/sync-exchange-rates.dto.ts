import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class SyncExchangeRatesDto {
  @ApiPropertyOptional({ example: '2026-03-26' })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
}
