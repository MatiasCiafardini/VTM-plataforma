import { PartialType } from '@nestjs/swagger';
import { CreateStudentDashboardLinkDto } from './create-student-dashboard-link.dto';

export class UpdateStudentDashboardLinkDto extends PartialType(
  CreateStudentDashboardLinkDto,
) {}
