import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { RegistrationCodesService } from '../registration-codes/registration-codes.service';
import { StudentsService } from '../students/students.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterStudentDto } from './dto/register-student.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly studentsService: StudentsService,
    private readonly registrationCodesService: RegistrationCodesService,
    private readonly jwtService: JwtService,
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
        await this.prisma.adminProfile.create({ data: { userId } });
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
}
