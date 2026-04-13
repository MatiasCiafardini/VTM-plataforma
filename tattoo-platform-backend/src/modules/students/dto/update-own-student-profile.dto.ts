import { ApiPropertyOptional } from '@nestjs/swagger';
import { DisplayCurrencyMode } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateOwnStudentProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instagramHandle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  birthDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  localCurrencyId?: string;

  @ApiPropertyOptional({ enum: DisplayCurrencyMode })
  @IsOptional()
  @IsEnum(DisplayCurrencyMode)
  displayCurrencyMode?: DisplayCurrencyMode;
}
