import { IsDefined, IsObject } from 'class-validator';

export class UpdateAdminSettingsDto {
  @IsDefined()
  @IsObject()
  settings!: unknown;
}
