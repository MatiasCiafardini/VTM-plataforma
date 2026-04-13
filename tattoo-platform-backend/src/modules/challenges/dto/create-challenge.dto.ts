import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

export class CreateChallengeDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 'trophy' })
  @IsOptional()
  @IsString()
  iconKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rewardTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({
    require_tld: false,
  })
  rewardUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metricDefinitionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  targetValue?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  difficultyStars?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  prerequisiteChallengeId?: string;
}
