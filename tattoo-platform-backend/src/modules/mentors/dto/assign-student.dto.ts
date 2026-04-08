import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AssignStudentDto {
  @ApiProperty()
  @IsString()
  studentId!: string;
}
