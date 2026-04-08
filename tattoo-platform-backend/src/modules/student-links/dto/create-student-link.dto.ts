import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateStudentLinkDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsUrl()
  url!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
