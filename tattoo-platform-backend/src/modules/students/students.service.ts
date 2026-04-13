import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DisplayCurrencyMode, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { UsersService } from '../users/users.service';
import { getCurrencyCodeForCountry } from './student-country-currency';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateOwnStudentProfileDto } from './dto/update-own-student-profile.dto';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async createStudent(dto: CreateStudentDto) {
    const student = await this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });

      if (existingUser) {
        throw new ConflictException('A user with that email already exists');
      }

      if (dto.localCurrencyId) {
        await this.ensureCurrencyExists(dto.localCurrencyId, tx);
      }

      const resolvedCurrencyId = await this.resolveLocalCurrencyId(
        dto.localCurrencyId,
        dto.country,
        tx,
      );

      const createdUser = await this.usersService.createUser(
        {
          email: dto.email,
          password: dto.password,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: UserRole.STUDENT,
          status: dto.status,
        },
        tx,
      );

      const createdStudent = await tx.studentProfile.create({
        data: {
          userId: createdUser.id,
          country: dto.country,
          instagramHandle: dto.instagramHandle,
          timezone: dto.timezone,
          localCurrencyId: resolvedCurrencyId,
          displayCurrencyMode:
            dto.displayCurrencyMode ?? DisplayCurrencyMode.BOTH,
          mentorAssignments: dto.mentorIds?.length
            ? {
                createMany: {
                  data: dto.mentorIds.map((mentorId) => ({ mentorId })),
                },
              }
            : undefined,
        },
        include: this.studentInclude,
      });

      return createdStudent;
    });

    return student;
  }

  findAll() {
    return this.prisma.studentProfile.findMany({
      include: this.studentInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdOrThrow(studentId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: this.studentInclude,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async findAccessibleByIdOrThrow(studentId: string, actor: AuthenticatedUser) {
    if (actor.role === UserRole.ADMIN) {
      return this.findByIdOrThrow(studentId);
    }

    const student = await this.prisma.studentProfile.findFirst({
      where: {
        id: studentId,
        mentorAssignments: {
          some: {
            mentor: {
              userId: actor.sub,
            },
          },
        },
      },
      include: this.studentInclude,
    });

    if (!student) {
      throw new ForbiddenException(
        'You can only access students assigned to you',
      );
    }

    return student;
  }

  async getOwnProfile(userId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: this.studentInclude,
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    return student;
  }

  async updateOwnProfile(userId: string, dto: UpdateOwnStudentProfileDto) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    if (dto.localCurrencyId) {
      await this.ensureCurrencyExists(dto.localCurrencyId, this.prisma);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.firstName !== undefined || dto.lastName !== undefined) {
        await tx.user.update({
          where: { id: student.userId },
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        });
      }

      const resolvedCurrencyId = await this.resolveLocalCurrencyId(
        dto.localCurrencyId,
        dto.country,
        tx,
      );

      return tx.studentProfile.update({
        where: { userId },
        data: {
          nationality: dto.nationality,
          country: dto.country,
          instagramHandle: dto.instagramHandle,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          timezone: dto.timezone,
          localCurrencyId: resolvedCurrencyId,
          displayCurrencyMode: dto.displayCurrencyMode,
        },
        include: this.studentInclude,
      });
    });
  }

  private async ensureCurrencyExists(
    currencyId: string,
    client: Prisma.TransactionClient | PrismaService,
  ) {
    const currency = await client.currency.findUnique({
      where: { id: currencyId },
    });

    if (!currency) {
      throw new NotFoundException('Currency not found');
    }
  }

  private async resolveLocalCurrencyId(
    localCurrencyId: string | undefined,
    country: string | undefined,
    client: Prisma.TransactionClient | PrismaService,
  ) {
    if (localCurrencyId) {
      return localCurrencyId;
    }

    const inferredCurrencyCode = getCurrencyCodeForCountry(country);

    if (!inferredCurrencyCode) {
      return undefined;
    }

    const currency = await client.currency.findUnique({
      where: { code: inferredCurrencyCode },
    });

    return currency?.id;
  }

  private readonly studentInclude = {
    user: {
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    },
    localCurrency: true,
    mentorAssignments: {
      include: {
        mentor: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                status: true,
              },
            },
          },
        },
      },
    },
  } as const;
}
