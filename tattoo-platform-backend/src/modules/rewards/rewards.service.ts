import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RewardStatus, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { StudentsService } from '../students/students.service';
import { AssignRewardDto } from './dto/assign-reward.dto';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { UpdateStudentRewardDto } from './dto/update-student-reward.dto';

@Injectable()
export class RewardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentsService: StudentsService,
  ) {}

  createReward(dto: CreateRewardDto) {
    return this.prisma.reward.create({
      data: {
        title: dto.title,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
    });
  }

  listRewards() {
    return this.prisma.reward.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async updateReward(id: string, dto: UpdateRewardDto) {
    await this.findRewardByIdOrThrow(id);

    return this.prisma.reward.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        isActive: dto.isActive,
      },
    });
  }

  async assignReward(dto: AssignRewardDto) {
    await this.findRewardByIdOrThrow(dto.rewardId);
    await this.studentsService.findByIdOrThrow(dto.studentId);

    const existingAssignment = await this.prisma.studentReward.findFirst({
      where: {
        studentId: dto.studentId,
        rewardId: dto.rewardId,
      },
    });

    if (existingAssignment) {
      throw new ConflictException(
        'This reward is already assigned to the student',
      );
    }

    const status = dto.status ?? RewardStatus.AWARDED;
    const awardedAt =
      dto.awardedAt !== undefined
        ? new Date(dto.awardedAt)
        : status === RewardStatus.AWARDED || status === RewardStatus.REDEEMED
          ? new Date()
          : undefined;

    return this.prisma.studentReward.create({
      data: {
        studentId: dto.studentId,
        rewardId: dto.rewardId,
        status,
        awardedAt,
        redeemedAt: status === RewardStatus.REDEEMED ? new Date() : undefined,
      },
      include: this.studentRewardInclude,
    });
  }

  async listStudentRewards(studentId: string, actor: AuthenticatedUser) {
    await this.ensureStudentAccess(studentId, actor);

    return this.prisma.studentReward.findMany({
      where: { studentId },
      include: this.studentRewardInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async listOwnRewards(userId: string) {
    const student = await this.studentsService.getOwnProfile(userId);
    return this.prisma.studentReward.findMany({
      where: { studentId: student.id },
      include: this.studentRewardInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async updateStudentReward(
    studentRewardId: string,
    dto: UpdateStudentRewardDto,
    actor: AuthenticatedUser,
  ) {
    const studentReward =
      await this.findStudentRewardByIdOrThrow(studentRewardId);

    if (actor.role === UserRole.STUDENT) {
      const student = await this.studentsService.getOwnProfile(actor.sub);
      if (studentReward.studentId !== student.id) {
        throw new ForbiddenException('You can only update your own rewards');
      }

      if (dto.status && dto.status !== RewardStatus.REDEEMED) {
        throw new ForbiddenException('Students can only redeem their rewards');
      }
    } else {
      await this.ensureStudentAccess(studentReward.studentId, actor);
    }

    const nextStatus = dto.status ?? studentReward.status;

    return this.prisma.studentReward.update({
      where: { id: studentRewardId },
      data: {
        status: dto.status,
        awardedAt:
          dto.awardedAt !== undefined
            ? new Date(dto.awardedAt)
            : nextStatus === RewardStatus.AWARDED &&
                !studentReward.awardedAt &&
                dto.status === RewardStatus.AWARDED
              ? new Date()
              : undefined,
        redeemedAt:
          dto.redeemedAt !== undefined
            ? new Date(dto.redeemedAt)
            : nextStatus === RewardStatus.REDEEMED && !studentReward.redeemedAt
              ? new Date()
              : undefined,
      },
      include: this.studentRewardInclude,
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
      throw new ForbiddenException('You can only access your own rewards');
    }
  }

  private async findRewardByIdOrThrow(id: string) {
    const reward = await this.prisma.reward.findUnique({
      where: { id },
    });

    if (!reward) {
      throw new NotFoundException('Reward not found');
    }

    return reward;
  }

  private async findStudentRewardByIdOrThrow(id: string) {
    const reward = await this.prisma.studentReward.findUnique({
      where: { id },
      include: this.studentRewardInclude,
    });

    if (!reward) {
      throw new NotFoundException('Student reward not found');
    }

    return reward;
  }

  private readonly studentRewardInclude = {
    reward: true,
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
