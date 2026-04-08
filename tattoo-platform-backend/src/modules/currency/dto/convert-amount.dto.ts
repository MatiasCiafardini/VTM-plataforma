import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsString } from 'class-validator';

export class ConvertAmountDto {
  @ApiProperty()
  @IsString()
  fromCurrencyId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @ApiProperty({ example: '2026-03-25T00:00:00.000Z' })
  @IsDateString()
  effectiveDate!: string;
}
