import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateGroupMeetingDto {
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
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: '0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weekDay?: number;

  @ApiPropertyOptional({ example: '2026-04-30' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  scheduledDate?: string;

  @ApiPropertyOptional({ example: '18:30' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  startTime?: string;

  @ApiPropertyOptional({ example: '19:30' })
  @IsOptional()
  @ValidateIf((_, value: unknown) => value !== null)
  @Matches(/^\d{2}:\d{2}$/)
  endTime?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkUrl?: string;
}
