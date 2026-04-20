import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRegistrationCodeDto {
  @ApiProperty({ example: 'VMT2026ADMIN' })
  @IsString()
  code!: string;

  @ApiPropertyOptional({ example: 'Acceso para administradores' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 5, description: 'Maximo de usos permitidos. Null = ilimitado.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;
}
