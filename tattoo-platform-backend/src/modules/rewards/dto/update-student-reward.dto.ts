import { ApiPropertyOptional } from '@nestjs/swagger';
import { RewardStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class UpdateStudentRewardDto {
  @ApiPropertyOptional({ enum: RewardStatus })
  @IsOptional()
  @IsEnum(RewardStatus)
  status?: RewardStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  awardedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  redeemedAt?: string;
}
