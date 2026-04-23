import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRegistrationCodeDto } from './dto/create-registration-code.dto';
import { UpdateRegistrationCodeDto } from './dto/update-registration-code.dto';

@Injectable()
export class RegistrationCodesService {
  constructor(private readonly prisma: PrismaService) {}

  listCodes() {
    return this.prisma.registrationCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCode(dto: CreateRegistrationCodeDto) {
    const normalized = dto.code.trim().toUpperCase();

    const existing = await this.prisma.registrationCode.findUnique({
      where: { code: normalized },
    });

    if (existing) {
      throw new ConflictException('Ya existe un codigo con ese valor.');
    }

    return this.prisma.registrationCode.create({
      data: {
        code: normalized,
        label: dto.label?.trim() || null,
        role: dto.role,
        isActive: dto.isActive ?? true,
        maxUses: dto.maxUses ?? null,
      },
    });
  }

  async updateCode(id: string, dto: UpdateRegistrationCodeDto) {
    await this.findByIdOrThrow(id);

    return this.prisma.registrationCode.update({
      where: { id },
      data: {
        label: dto.label !== undefined ? dto.label.trim() || null : undefined,
        isActive: dto.isActive,
        maxUses: dto.maxUses !== undefined ? dto.maxUses : undefined,
      },
    });
  }

  async deleteCode(id: string) {
    await this.findByIdOrThrow(id);
    await this.prisma.registrationCode.delete({ where: { id } });
    return { success: true };
  }

  async findActiveByCode(code: string) {
    const normalized = code.trim().toUpperCase();
    return this.prisma.registrationCode.findFirst({
      where: { code: normalized, isActive: true },
    });
  }

  async incrementUsage(id: string) {
    await this.prisma.registrationCode.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }

  private async findByIdOrThrow(id: string) {
    const code = await this.prisma.registrationCode.findUnique({
      where: { id },
    });

    if (!code) {
      throw new NotFoundException('Registration code not found');
    }

    return code;
  }
}
