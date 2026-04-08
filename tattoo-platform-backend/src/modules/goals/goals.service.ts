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
import { AssignGoalDto } from './dto/assign-goal.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { UpdateStudentGoalDto } from './dto/update-student-goal.dto';

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentsService: StudentsService,
  ) {}

  createGoal(dto: CreateGoalDto) {
    return this.prisma.goal.create({
      data: {
        title: dto.title,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
    });
  }

  listGoals() {
    return this.prisma.goal.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async updateGoal(id: string, dto: UpdateGoalDto) {
    await this.findGoalByIdOrThrow(id);

    return this.prisma.goal.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        isActive: dto.isActive,
      },
    });
  }

  async assignGoal(dto: AssignGoalDto) {
    await this.findGoalByIdOrThrow(dto.goalId);
    await this.studentsService.findByIdOrThrow(dto.studentId);

    const existingAssignment = await this.prisma.studentGoal.findFirst({
      where: {
        studentId: dto.studentId,
        goalId: dto.goalId,
      },
    });

    if (existingAssignment) {
      throw new ConflictException(
        'This goal is already assigned to the student',
      );
    }

    return this.prisma.studentGoal.create({
      data: {
        studentId: dto.studentId,
        goalId: dto.goalId,
        titleOverride: dto.titleOverride,
        targetValue: dto.targetValue,
        currentValue: dto.currentValue,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        status: dto.status,
      },
      include: this.studentGoalInclude,
    });
  }

  async listStudentGoals(studentId: string, actor: AuthenticatedUser) {
    await this.ensureStudentAccess(studentId, actor);

    return this.prisma.studentGoal.findMany({
      where: { studentId },
      include: this.studentGoalInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async listOwnGoals(userId: string) {
    const student = await this.studentsService.getOwnProfile(userId);
    return this.prisma.studentGoal.findMany({
      where: { studentId: student.id },
      include: this.studentGoalInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async updateStudentGoal(
    studentGoalId: string,
    dto: UpdateStudentGoalDto,
    actor: AuthenticatedUser,
  ) {
    const studentGoal = await this.findStudentGoalByIdOrThrow(studentGoalId);

    if (actor.role === UserRole.STUDENT) {
      const student = await this.studentsService.getOwnProfile(actor.sub);
      if (studentGoal.studentId !== student.id) {
        throw new ForbiddenException('You can only update your own goals');
      }
    } else {
      await this.ensureStudentAccess(studentGoal.studentId, actor);
    }

    return this.prisma.studentGoal.update({
      where: { id: studentGoalId },
      data: {
        currentValue: dto.currentValue,
        targetValue: dto.targetValue,
        status: dto.status,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: this.studentGoalInclude,
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
      throw new ForbiddenException('You can only access your own goals');
    }
  }

  private async findGoalByIdOrThrow(id: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    return goal;
  }

  private async findStudentGoalByIdOrThrow(id: string) {
    const goal = await this.prisma.studentGoal.findUnique({
      where: { id },
      include: this.studentGoalInclude,
    });

    if (!goal) {
      throw new NotFoundException('Student goal not found');
    }

    return goal;
  }

  private readonly studentGoalInclude = {
    goal: true,
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
