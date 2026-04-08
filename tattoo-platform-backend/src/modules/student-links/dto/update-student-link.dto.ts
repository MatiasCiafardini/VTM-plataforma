import { PartialType } from '@nestjs/swagger';
import { CreateStudentLinkDto } from './create-student-link.dto';

export class UpdateStudentLinkDto extends PartialType(CreateStudentLinkDto) {}
