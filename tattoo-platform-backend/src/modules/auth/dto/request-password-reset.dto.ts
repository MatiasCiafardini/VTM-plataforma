import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'alumno@tattoo-platform.local' })
  @IsEmail()
  email!: string;
}
