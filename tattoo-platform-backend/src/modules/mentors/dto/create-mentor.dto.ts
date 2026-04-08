import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateMentorDto {
  @ApiProperty({ example: 'mentor@tattoo-platform.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'supersecret123' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Marco' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Mentor' })
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
