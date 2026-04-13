import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AdminSettingsService } from '../admin-settings/admin-settings.service';
import { StudentsService } from '../students/students.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterStudentDto } from './dto/register-student.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly studentsService: StudentsService,
    private readonly adminSettingsService: AdminSettingsService,
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
    const settings = await this.adminSettingsService.getSettings();
    const configuredCode = this.normalizeAccessCode(
      settings.userOperations.studentRegistrationCode,
    );
    const incomingCode = this.normalizeAccessCode(dto.accessCode);

    if (!configuredCode) {
      throw new ForbiddenException('El registro esta deshabilitado temporalmente.');
    }

    if (incomingCode !== configuredCode) {
      throw new ForbiddenException('El codigo de registro no es valido.');
    }

    const createdStudent = await this.studentsService.createStudent({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      country: dto.country,
    });

    const createdUser = createdStudent.user;

    if (!createdUser) {
      throw new ConflictException('No pudimos crear la cuenta del alumno.');
    }

    if (createdUser.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        'Tu cuenta fue creada pero aun no esta activa. Contacta al administrador.',
      );
    }

    await this.usersService.updateLastLogin(createdUser.id);

    const payload: AuthenticatedUser = {
      sub: createdUser.id,
      email: createdUser.email,
      role: UserRole.STUDENT,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: createdUser,
    };
  }

  private normalizeAccessCode(value: string) {
    return value.trim().toUpperCase();
  }
}
