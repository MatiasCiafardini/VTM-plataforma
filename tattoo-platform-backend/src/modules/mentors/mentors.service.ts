import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AssignStudentDto } from './dto/assign-student.dto';
import { CreateMentorDto } from './dto/create-mentor.dto';

@Injectable()
export class MentorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async createMentor(dto: CreateMentorDto) {
    const createdUser = await this.usersService.createUser({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.MENTOR,
      status: dto.status,
    });

    return this.prisma.mentorProfile.create({
      data: {
        userId: createdUser.id,
      },
      include: this.mentorInclude,
    });
  }

  findAll() {
    return this.prisma.mentorProfile.findMany({
      include: this.mentorInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async assignStudent(mentorId: string, dto: AssignStudentDto) {
    await this.findByIdOrThrow(mentorId);
    await this.ensureStudentExists(dto.studentId);

    const existingAssignment =
      await this.prisma.mentorStudentAssignment.findFirst({
        where: {
          mentorId,
          studentId: dto.studentId,
        },
      });

    if (existingAssignment) {
      throw new ConflictException('Student is already assigned to this mentor');
    }

    await this.prisma.mentorStudentAssignment.create({
      data: {
        mentorId,
        studentId: dto.studentId,
      },
    });

    return this.findByIdOrThrow(mentorId);
  }

  async getAssignedStudentsForMentorUser(userId: string) {
    const mentor = await this.prisma.mentorProfile.findUnique({
      where: { userId },
      include: {
        studentAssignments: {
          include: {
            student: {
              include: {
                user: true,
                localCurrency: true,
              },
            },
          },
        },
      },
    });

    if (!mentor) {
      throw new NotFoundException('Mentor profile not found');
    }

    return mentor.studentAssignments.map((assignment) => assignment.student);
  }

  async findByIdOrThrow(mentorId: string) {
    const mentor = await this.prisma.mentorProfile.findUnique({
      where: { id: mentorId },
      include: this.mentorInclude,
    });

    if (!mentor) {
      throw new NotFoundException('Mentor not found');
    }

    return mentor;
  }

  private async ensureStudentExists(studentId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }
  }

  private readonly mentorInclude = {
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
    studentAssignments: {
      include: {
        student: {
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
