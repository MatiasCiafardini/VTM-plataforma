import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { hash } from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminSettingsService } from '../admin-settings/admin-settings.service';
import { CreateAdminQuickLinkDto } from './dto/create-admin-quick-link.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateAdminQuickLinkDto } from './dto/update-admin-quick-link.dto';
import { UpdateOwnAdminProfileDto } from './dto/update-own-admin-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminSettingsService: AdminSettingsService,
  ) {}

  async createUser(
    dto: CreateUserDto,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const existingUser = await client.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('A user with that email already exists');
    }

    const passwordHash = await hash(dto.password, 10);

    const user = await client.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        status: await this.adminSettingsService.resolveDefaultStatus(
          dto.role,
          dto.status ?? undefined,
        ),
      },
    });

    return this.toSafeUser(user);
  }

  findAll() {
    return this.prisma.user
      .findMany({
        orderBy: { createdAt: 'desc' },
      })
      .then((users) => users.map((user) => this.toSafeUser(user)));
  }

  async findByIdOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  findUserWithPasswordByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async updateStatus(id: string, status: UserStatus) {
    await this.findByIdOrThrow(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: { status },
    });

    return this.toSafeUser(user);
  }

  async updateLastLogin(id: string) {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async getOwnAdminProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        adminProfile: {
          include: {
            localCurrency: true,
          },
        },
      },
    });

    if (!user || user.role !== UserRole.ADMIN) {
      throw new NotFoundException('Admin profile not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      adminProfile: user.adminProfile,
    };
  }

  async updateOwnAdminProfile(userId: string, dto: UpdateOwnAdminProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        adminProfile: true,
      },
    });

    if (!user || user.role !== UserRole.ADMIN) {
      throw new NotFoundException('Admin profile not found');
    }

    if (dto.localCurrencyId) {
      const currency = await this.prisma.currency.findUnique({
        where: { id: dto.localCurrencyId },
      });

      if (!currency) {
        throw new NotFoundException('Currency not found');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.firstName !== undefined || dto.lastName !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        });
      }

      await tx.adminProfile.upsert({
        where: { userId },
        update: {
          nationality: dto.nationality,
          country: dto.country,
          localCurrencyId: dto.localCurrencyId,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
        },
        create: {
          userId,
          nationality: dto.nationality,
          country: dto.country,
          localCurrencyId: dto.localCurrencyId,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
        },
      });
    });

    return this.getOwnAdminProfile(userId);
  }

  async listOwnAdminQuickLinks(userId: string) {
    const adminProfile = await this.getOwnAdminProfileOrThrow(userId);

    return this.prisma.adminQuickLink.findMany({
      where: { adminProfileId: adminProfile.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createOwnAdminQuickLink(userId: string, dto: CreateAdminQuickLinkDto) {
    const adminProfile = await this.getOwnAdminProfileOrThrow(userId);

    return this.prisma.adminQuickLink.create({
      data: {
        adminProfileId: adminProfile.id,
        title: dto.title,
        url: dto.url,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateOwnAdminQuickLink(
    userId: string,
    linkId: string,
    dto: UpdateAdminQuickLinkDto,
  ) {
    const adminProfile = await this.getOwnAdminProfileOrThrow(userId);
    const link = await this.findOwnAdminQuickLinkOrThrow(
      adminProfile.id,
      linkId,
    );

    return this.prisma.adminQuickLink.update({
      where: { id: link.id },
      data: {
        title: dto.title,
        url: dto.url,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async deleteOwnAdminQuickLink(userId: string, linkId: string) {
    const adminProfile = await this.getOwnAdminProfileOrThrow(userId);
    const link = await this.findOwnAdminQuickLinkOrThrow(
      adminProfile.id,
      linkId,
    );

    await this.prisma.adminQuickLink.delete({
      where: { id: link.id },
    });

    return { success: true };
  }

  toSafeUser<T extends { passwordHash?: string | null }>(user: T) {
    const { passwordHash, ...safeUser } = user;
    void passwordHash;
    return safeUser;
  }

  isAdmin(role: UserRole) {
    return role === UserRole.ADMIN;
  }

  private async getOwnAdminProfileOrThrow(userId: string) {
    const adminProfile = await this.prisma.adminProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    return adminProfile;
  }

  private async findOwnAdminQuickLinkOrThrow(
    adminProfileId: string,
    linkId: string,
  ) {
    const link = await this.prisma.adminQuickLink.findFirst({
      where: {
        id: linkId,
        adminProfileId,
      },
    });

    if (!link) {
      throw new NotFoundException('Admin quick link not found');
    }

    return link;
  }
}
