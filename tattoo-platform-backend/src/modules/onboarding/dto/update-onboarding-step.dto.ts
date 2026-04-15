import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  OnboardingAutomationKey,
  OnboardingCompletionMode,
  OnboardingStepKind,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { OnboardingStepResourceDto } from './onboarding-step-resource.dto';

export class UpdateOnboardingStepDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phaseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationHint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notesInternal?: string;

  @ApiPropertyOptional({ enum: OnboardingStepKind })
  @IsOptional()
  @IsEnum(OnboardingStepKind)
  stepKind?: OnboardingStepKind;

  @ApiPropertyOptional({ enum: OnboardingCompletionMode })
  @IsOptional()
  @IsEnum(OnboardingCompletionMode)
  completionMode?: OnboardingCompletionMode;

  @ApiPropertyOptional({ enum: OnboardingAutomationKey, nullable: true })
  @IsOptional()
  @IsEnum(OnboardingAutomationKey)
  automationKey?: OnboardingAutomationKey | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  countsForProgress?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  challengeId?: string | null;

  @ApiPropertyOptional({ type: [OnboardingStepResourceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnboardingStepResourceDto)
  resources?: OnboardingStepResourceDto[];
}
