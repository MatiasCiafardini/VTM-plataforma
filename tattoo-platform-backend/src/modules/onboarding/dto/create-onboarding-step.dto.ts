import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateOnboardingStepDto {
  @ApiProperty()
  @IsString()
  phaseId!: string;

  @ApiProperty()
  @IsString()
  title!: string;

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

  @ApiPropertyOptional({
    enum: OnboardingStepKind,
    default: OnboardingStepKind.ACTION_MANUAL,
  })
  @IsOptional()
  @IsEnum(OnboardingStepKind)
  stepKind?: OnboardingStepKind;

  @ApiPropertyOptional({
    enum: OnboardingCompletionMode,
    default: OnboardingCompletionMode.SELF_SERVICE,
  })
  @IsOptional()
  @IsEnum(OnboardingCompletionMode)
  completionMode?: OnboardingCompletionMode;

  @ApiPropertyOptional({ enum: OnboardingAutomationKey })
  @IsOptional()
  @IsEnum(OnboardingAutomationKey)
  automationKey?: OnboardingAutomationKey;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  countsForProgress?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  challengeId?: string;

  @ApiPropertyOptional({ type: [OnboardingStepResourceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnboardingStepResourceDto)
  resources?: OnboardingStepResourceDto[];
}
