import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { StudentsService } from '../students/students.service';
import { AssignChallengeDto } from './dto/assign-challenge.dto';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { UpdateChallengeDto } from './dto/update-challenge.dto';
import { UpdateStudentChallengeDto } from './dto/update-student-challenge.dto';

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentsService: StudentsService,
  ) {}

  async createChallenge(dto: CreateChallengeDto) {
    if (dto.metricDefinitionId) {
      await this.ensureMetricDefinitionExists(dto.metricDefinitionId);
    }

    return this.prisma.challenge.create({
      data: {
        title: dto.title,
        description: dto.description,
        iconKey: dto.iconKey ?? 'trophy',
        rewardTitle: dto.rewardTitle,
        rewardUrl: dto.rewardUrl,
        metricDefinitionId: dto.metricDefinitionId,
        targetValue: dto.targetValue,
        difficultyStars: dto.difficultyStars ?? 1,
        isActive: dto.isActive ?? true,
        prerequisiteChallengeId: dto.prerequisiteChallengeId ?? null,
      },
      include: this.challengeInclude,
    });
  }

  listChallenges() {
    return this.prisma.challenge.findMany({
      include: this.challengeInclude,
      orderBy: [{ difficultyStars: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async updateChallenge(id: string, dto: UpdateChallengeDto) {
    await this.findChallengeByIdOrThrow(id);

    if (dto.metricDefinitionId) {
      await this.ensureMetricDefinitionExists(dto.metricDefinitionId);
    }

    return this.prisma.challenge.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        iconKey: dto.iconKey,
        rewardTitle: dto.rewardTitle,
        rewardUrl: dto.rewardUrl,
        metricDefinitionId: dto.metricDefinitionId,
        targetValue: dto.targetValue,
        difficultyStars: dto.difficultyStars,
        isActive: dto.isActive,
        prerequisiteChallengeId: dto.prerequisiteChallengeId,
      },
      include: this.challengeInclude,
    });
  }

  async assignChallenge(dto: AssignChallengeDto) {
    await this.findChallengeByIdOrThrow(dto.challengeId);
    await this.studentsService.findByIdOrThrow(dto.studentId);

    const existingAssignment = await this.prisma.studentChallenge.findFirst({
      where: {
        studentId: dto.studentId,
        challengeId: dto.challengeId,
      },
    });

    if (existingAssignment) {
      throw new ConflictException(
        'This challenge is already assigned to the student',
      );
    }

    return this.prisma.studentChallenge.create({
      data: {
        studentId: dto.studentId,
        challengeId: dto.challengeId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        status: dto.status,
      },
      include: this.studentChallengeInclude,
    });
  }

  async listStudentChallenges(studentId: string, actor: AuthenticatedUser) {
    await this.ensureStudentAccess(studentId, actor);

    return this.prisma.studentChallenge.findMany({
      where: { studentId },
      include: this.studentChallengeInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async listOwnChallenges(userId: string) {
    const student = await this.studentsService.getOwnProfile(userId);
    return this.prisma.studentChallenge.findMany({
      where: { studentId: student.id },
      include: this.studentChallengeInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async updateStudentChallenge(
    studentChallengeId: string,
    dto: UpdateStudentChallengeDto,
    actor: AuthenticatedUser,
  ) {
    const studentChallenge =
      await this.findStudentChallengeByIdOrThrow(studentChallengeId);

    if (actor.role === UserRole.STUDENT) {
      const student = await this.studentsService.getOwnProfile(actor.sub);
      if (studentChallenge.studentId !== student.id) {
        throw new ForbiddenException('You can only update your own challenges');
      }
    } else {
      await this.ensureStudentAccess(studentChallenge.studentId, actor);
    }

    return this.prisma.studentChallenge.update({
      where: { id: studentChallengeId },
      data: {
        status: dto.status,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: this.studentChallengeInclude,
    });
  }

  private async ensureStudentAccess(
    studentId: string,
    actor: AuthenticatedUser,
  ) {
    if (actor.role === UserRole.ADMIN) {
      await this.studentsService.findByIdOrThrow(studentId);
      return;
    }

    if (actor.role === UserRole.MENTOR) {
      await this.studentsService.findAccessibleByIdOrThrow(studentId, actor);
      return;
    }

    const student = await this.studentsService.getOwnProfile(actor.sub);
    if (student.id !== studentId) {
      throw new ForbiddenException('You can only access your own challenges');
    }
  }

  private async findChallengeByIdOrThrow(id: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id },
      include: this.challengeInclude,
    });

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    return challenge;
  }

  private readonly challengeInclude = {
    metricDefinition: true,
    prerequisiteChallenge: {
      select: {
        id: true,
        title: true,
        difficultyStars: true,
        iconKey: true,
      },
    },
  } as const;

  private async ensureMetricDefinitionExists(metricDefinitionId: string) {
    const metricDefinition = await this.prisma.metricDefinition.findUnique({
      where: { id: metricDefinitionId },
    });

    if (!metricDefinition) {
      throw new NotFoundException('Metric definition not found');
    }

    return metricDefinition;
  }

  private async findStudentChallengeByIdOrThrow(id: string) {
    const challenge = await this.prisma.studentChallenge.findUnique({
      where: { id },
      include: this.studentChallengeInclude,
    });

    if (!challenge) {
      throw new NotFoundException('Student challenge not found');
    }

    return challenge;
  }

  private readonly studentChallengeInclude = {
    challenge: true,
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
  } as const;
}
