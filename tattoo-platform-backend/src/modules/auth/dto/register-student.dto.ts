import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterStudentDto {
  @ApiProperty({ example: 'nuevo@tattoo-platform.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'supersecret123' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password!: string;

  @ApiProperty({ example: 'Vende' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Mas' })
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ example: 'Argentina' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: 'VMT2026' })
  @IsString()
  accessCode!: string;

  @ApiPropertyOptional({ example: '1995-08-21' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;
}
