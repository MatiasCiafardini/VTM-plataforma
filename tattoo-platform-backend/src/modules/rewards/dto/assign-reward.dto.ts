import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RewardStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class AssignRewardDto {
  @ApiProperty()
  @IsString()
  studentId!: string;

  @ApiProperty()
  @IsString()
  rewardId!: string;

  @ApiPropertyOptional({ enum: RewardStatus, default: RewardStatus.AWARDED })
  @IsOptional()
  @IsEnum(RewardStatus)
  status?: RewardStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  awardedAt?: string;
}
