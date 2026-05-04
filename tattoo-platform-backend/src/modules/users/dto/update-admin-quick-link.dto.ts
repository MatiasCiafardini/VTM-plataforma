import { PartialType } from '@nestjs/swagger';
import { CreateAdminQuickLinkDto } from './create-admin-quick-link.dto';

export class UpdateAdminQuickLinkDto extends PartialType(
  CreateAdminQuickLinkDto,
) {}
