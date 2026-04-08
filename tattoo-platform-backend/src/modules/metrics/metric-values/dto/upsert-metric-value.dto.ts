import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class MetricValueInputDto {
  @ApiProperty()
  @IsString()
  metricDefinitionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  numberValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  booleanValue?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  originalAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  originalCurrencyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  usdAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conversionSnapshotId?: string;
}

export class UpsertMetricValuesDto {
  @ApiProperty({ type: [MetricValueInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetricValueInputDto)
  values!: MetricValueInputDto[];
}
