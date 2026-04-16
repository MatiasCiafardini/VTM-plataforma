import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisplayCurrencyMode, UserStatus } from '@prisma/client';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateStudentDto {
  @ApiProperty({ example: 'student@tattoo-platform.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'supersecret123' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Tina' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Ink' })
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instagramHandle?: string;

  @ApiPropertyOptional({ example: '1995-08-21' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  localCurrencyId?: string;

  @ApiPropertyOptional({
    enum: DisplayCurrencyMode,
    default: DisplayCurrencyMode.BOTH,
  })
  @IsOptional()
  @IsEnum(DisplayCurrencyMode)
  displayCurrencyMode?: DisplayCurrencyMode;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentorIds?: string[];
}
