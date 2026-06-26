import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { NotificationType, UserRole, UserStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { RegistrationCodesService } from '../registration-codes/registration-codes.service';
import { StudentsService } from '../students/students.service';
import { getCurrencyCodeForCountry } from '../students/student-country-currency';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyPasswordResetCodeDto } from './dto/verify-password-reset-code.dto';
import { PasswordResetMailerService } from './password-reset-mailer.service';

const PASSWORD_RESET_CODE_TTL_MINUTES = 15;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly studentsService: StudentsService,
    private readonly registrationCodesService: RegistrationCodesService,
    private readonly jwtService: JwtService,
    private readonly passwordResetMailer: PasswordResetMailerService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findUserWithPasswordByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('This user is inactive');
    }

    await this.usersService.updateLastLogin(user.id);

    const payload: AuthenticatedUser = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: this.usersService.toSafeUser(user),
    };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const user = await this.usersService.findUserWithPasswordByEmail(dto.email);

    if (!user || user.status !== UserStatus.ACTIVE) {
      return this.passwordResetRequestedResponse();
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = await hash(code, 10);
    const expiresAt = new Date(
      Date.now() + PASSWORD_RESET_CODE_TTL_MINUTES * 60 * 1000,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetCode.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      await tx.passwordResetCode.create({
        data: {
          userId: user.id,
          codeHash,
          expiresAt,
        },
      });
    });

    await this.passwordResetMailer.sendResetCode({
      email: user.email,
      firstName: user.firstName,
      code,
      expiresInMinutes: PASSWORD_RESET_CODE_TTL_MINUTES,
    });

    return this.passwordResetRequestedResponse();
  }

  async verifyPasswordResetCode(dto: VerifyPasswordResetCodeDto) {
    await this.resolveValidPasswordResetCode(dto.email, dto.code);

    return { valid: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { user, resetCode } = await this.resolveValidPasswordResetCode(
      dto.email,
      dto.code,
    );

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('This user is inactive');
    }

    const passwordHash = await hash(dto.password, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          lastLoginAt: new Date(),
        },
      });

      await tx.passwordResetCode.update({
        where: { id: resetCode.id },
        data: { consumedAt: new Date() },
      });

      await tx.notification.create({
        data: {
          type: NotificationType.PASSWORD_UPDATED,
          title: 'Contraseña actualizada',
          message: 'Tu contraseña se actualizo correctamente.',
          recipientUserId: user.id,
        },
      });
    });

    const payload: AuthenticatedUser = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: this.usersService.toSafeUser(user),
    };
  }

  async getMe(userId: string) {
    const user = await this.usersService.findByIdOrThrow(userId);
    return this.usersService.toSafeUser(user);
  }

  async registerStudent(dto: RegisterStudentDto) {
    const code = await this.registrationCodesService.findActiveByCode(
      dto.accessCode,
    );

    if (!code) {
      throw new ForbiddenException('El codigo de registro no es valido.');
    }

    if (code.maxUses !== null && code.usageCount >= code.maxUses) {
      throw new ForbiddenException(
        'Este codigo de registro ya alcanzo el limite de usos.',
      );
    }

    let userId: string;
    let safeUser: ReturnType<UsersService['toSafeUser']>;
    let userStatus: UserStatus;

    if (code.role === UserRole.STUDENT) {
      const student = await this.studentsService.createStudent({
        email: dto.email,
        password: dto.password,
        firstName: dto.firstName,
        lastName: dto.lastName,
        country: dto.country ?? '',
        nationality: dto.country ?? '',
        instagramHandle: dto.instagramHandle?.replace(/^@/, ''),
        phoneCountryCode: dto.phoneCountryCode,
        phoneNumber: dto.phoneNumber?.replace(/\s+/g, ''),
        birthDate: dto.birthDate,
      });

      if (!student.user) {
        throw new ConflictException('No pudimos crear la cuenta.');
      }

      userId = student.user.id;
      safeUser = student.user;
      userStatus = student.user.status;
    } else {
      const user = await this.usersService.createUser({
        email: dto.email,
        password: dto.password,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: code.role,
      });

      userId = user.id;
      safeUser = user;
      userStatus = user.status;

      if (code.role === UserRole.MENTOR) {
        await this.prisma.mentorProfile.create({ data: { userId } });
      } else if (code.role === UserRole.ADMIN) {
        const localCurrencyId = await this.resolveLocalCurrencyId(dto.country);

        await this.prisma.adminProfile.create({
          data: {
            userId,
            nationality: dto.country,
            country: dto.country,
            birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
            localCurrencyId,
          },
        });
      }
    }

    await this.registrationCodesService.incrementUsage(code.id);

    if (userStatus !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        'Tu cuenta fue creada pero aun no esta activa. Contacta al administrador.',
      );
    }

    await this.usersService.updateLastLogin(userId);

    const payload: AuthenticatedUser = {
      sub: userId,
      email: dto.email,
      role: code.role,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: safeUser,
    };
  }

  private async resolveLocalCurrencyId(country: string | undefined) {
    const currencyCode = getCurrencyCodeForCountry(country);

    if (!currencyCode) {
      return undefined;
    }

    const currency = await this.prisma.currency.findUnique({
      where: { code: currencyCode },
    });

    return currency?.id;
  }

  private passwordResetRequestedResponse() {
    return {
      message:
        'Si el email existe, te enviamos un codigo para recuperar tu contraseña.',
    };
  }

  private async resolveValidPasswordResetCode(email: string, code: string) {
    const user = await this.usersService.findUserWithPasswordByEmail(email);

    if (!user) {
      throw new UnauthorizedException('El codigo no es valido o ya vencio.');
    }

    const resetCode = await this.prisma.passwordResetCode.findFirst({
      where: {
        userId: user.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
        attempts: { lt: PASSWORD_RESET_MAX_ATTEMPTS },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetCode) {
      throw new UnauthorizedException('El codigo no es valido o ya vencio.');
    }

    const isValid = await compare(code, resetCode.codeHash);

    if (!isValid) {
      await this.prisma.passwordResetCode.update({
        where: { id: resetCode.id },
        data: { attempts: { increment: 1 } },
      });

      throw new UnauthorizedException('El codigo no es valido o ya vencio.');
    }

    return { user, resetCode };
  }
}
