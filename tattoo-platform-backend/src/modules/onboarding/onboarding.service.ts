import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChallengeStatus,
  MonthlyMetricPeriodStatus,
  OnboardingAutomationKey,
  OnboardingCompletionMode,
  OnboardingCompletionSource,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { StudentsService } from '../students/students.service';
import { CreateOnboardingPhaseDto } from './dto/create-onboarding-phase.dto';
import { CreateOnboardingStepDto } from './dto/create-onboarding-step.dto';
import { UpdateOnboardingPhaseDto } from './dto/update-onboarding-phase.dto';
import { UpdateOnboardingStepDto } from './dto/update-onboarding-step.dto';
import { UpdateOnboardingStepStatusDto } from './dto/update-onboarding-step-status.dto';

type RoadmapWithRelations = Prisma.OnboardingRoadmapGetPayload<{
  include: {
    phases: {
      include: {
        steps: {
          include: {
            resources: true;
            challenge: {
              include: {
                metricDefinition: true;
              };
            };
          };
        };
      };
    };
  };
}>;

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentsService: StudentsService,
  ) {}

  async getOwnRoadmap(actor: AuthenticatedUser) {
    const student = await this.studentsService.getOwnProfile(actor.sub);
    return this.buildStudentRoadmap(student.id);
  }

  async getStudentRoadmap(studentId: string, actor: AuthenticatedUser) {
    const student = await this.ensureAccessibleStudent(studentId, actor);
    return this.buildStudentRoadmap(student.id);
  }

  async getMentorStudentSummaries(actor: AuthenticatedUser) {
    if (actor.role !== UserRole.MENTOR) {
      throw new ForbiddenException(
        'Only mentors can access onboarding students',
      );
    }

    const mentor = await this.prisma.mentorProfile.findUnique({
      where: { userId: actor.sub },
      include: {
        studentAssignments: {
          include: {
            student: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!mentor) {
      throw new NotFoundException('Mentor profile not found');
    }

    const students = mentor.studentAssignments.map((a) => a.student);
    const summaries = await this.buildBatchStudentSummaries(students);
    return summaries.sort(
      (left, right) =>
        left.summary.progressPercentage - right.summary.progressPercentage,
    );
  }

  async getAdminStudentSummaries(actor: AuthenticatedUser) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only admins can access onboarding students',
      );
    }

    const students = await this.prisma.studentProfile.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    const summaries = await this.buildBatchStudentSummaries(students);

    return summaries.sort((left, right) => {
      if (
        left.summary.progressPercentage !== right.summary.progressPercentage
      ) {
        return (
          left.summary.progressPercentage - right.summary.progressPercentage
        );
      }

      const leftTime = left.summary.lastProgressAt
        ? new Date(left.summary.lastProgressAt).getTime()
        : 0;
      const rightTime = right.summary.lastProgressAt
        ? new Date(right.summary.lastProgressAt).getTime()
        : 0;

      return leftTime - rightTime;
    });
  }

  async getAdminRoadmap() {
    const roadmap = await this.getActiveRoadmapOrThrow(true);
    return this.serializeAdminRoadmap(roadmap);
  }

  async createPhase(dto: CreateOnboardingPhaseDto) {
    const roadmap = await this.getActiveRoadmapOrThrow(true);
    const sortOrder =
      dto.sortOrder ??
      roadmap.phases.reduce(
        (max, phase) => Math.max(max, phase.sortOrder),
        -1,
      ) + 1;

    await this.prisma.onboardingPhase.create({
      data: {
        roadmapId: roadmap.id,
        title: dto.title,
        description: dto.description,
        notesInternal: dto.notesInternal,
        sortOrder,
        isActive: dto.isActive ?? true,
        countsForProgress: dto.countsForProgress ?? true,
      },
    });

    return this.getAdminRoadmap();
  }

  async updatePhase(phaseId: string, dto: UpdateOnboardingPhaseDto) {
    await this.findPhaseByIdOrThrow(phaseId);

    await this.prisma.onboardingPhase.update({
      where: { id: phaseId },
      data: {
        title: dto.title,
        description: dto.description,
        notesInternal: dto.notesInternal,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
        countsForProgress: dto.countsForProgress,
      },
    });

    return this.getAdminRoadmap();
  }

  async deletePhase(phaseId: string) {
    await this.findPhaseByIdOrThrow(phaseId);
    await this.prisma.onboardingPhase.delete({
      where: { id: phaseId },
    });

    return this.getAdminRoadmap();
  }

  async createStep(dto: CreateOnboardingStepDto) {
    await this.findPhaseByIdOrThrow(dto.phaseId);

    if (dto.challengeId) {
      await this.ensureChallengeExists(dto.challengeId);
    }

    await this.prisma.onboardingStep.create({
      data: {
        phaseId: dto.phaseId,
        title: dto.title,
        description: dto.description,
        locationHint: dto.locationHint,
        notesInternal: dto.notesInternal,
        stepKind: dto.stepKind,
        completionMode: dto.completionMode,
        automationKey: dto.automationKey,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        isOptional: dto.isOptional ?? false,
        countsForProgress: dto.countsForProgress ?? true,
        challengeId: dto.challengeId,
        resources: dto.resources?.length
          ? {
              create: dto.resources.map((resource) => ({
                label: resource.label,
                url: resource.url,
                sortOrder: resource.sortOrder ?? 0,
              })),
            }
          : undefined,
      },
    });

    return this.getAdminRoadmap();
  }

  async updateStep(stepId: string, dto: UpdateOnboardingStepDto) {
    const step = await this.findStepByIdOrThrow(stepId);

    if (dto.phaseId) {
      await this.findPhaseByIdOrThrow(dto.phaseId);
    }

    if (dto.challengeId) {
      await this.ensureChallengeExists(dto.challengeId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.onboardingStep.update({
        where: { id: stepId },
        data: {
          phaseId: dto.phaseId,
          title: dto.title,
          description: dto.description,
          locationHint: dto.locationHint,
          notesInternal: dto.notesInternal,
          stepKind: dto.stepKind,
          completionMode: dto.completionMode,
          automationKey: dto.automationKey === null ? null : dto.automationKey,
          sortOrder: dto.sortOrder,
          isActive: dto.isActive,
          isOptional: dto.isOptional,
          countsForProgress: dto.countsForProgress,
          challengeId: dto.challengeId === null ? null : dto.challengeId,
        },
      });

      if (dto.resources) {
        await tx.onboardingStepResource.deleteMany({
          where: { stepId: step.id },
        });

        if (dto.resources.length > 0) {
          await tx.onboardingStepResource.createMany({
            data: dto.resources.map((resource, index) => ({
              stepId: step.id,
              label: resource.label,
              url: resource.url,
              sortOrder: resource.sortOrder ?? index,
            })),
          });
        }
      }
    });

    return this.getAdminRoadmap();
  }

  async deleteStep(stepId: string) {
    await this.findStepByIdOrThrow(stepId);
    await this.prisma.onboardingStep.delete({
      where: { id: stepId },
    });

    return this.getAdminRoadmap();
  }

  async updateStepStatus(
    stepId: string,
    dto: UpdateOnboardingStepStatusDto,
    actor: AuthenticatedUser,
  ) {
    const step = await this.findStepByIdOrThrow(stepId);
    const isCompleted = dto.isCompleted ?? true;
    const studentId = await this.resolveStepStatusStudentId(
      dto.studentId,
      actor,
    );

    if (actor.role === UserRole.STUDENT) {
      if (step.completionMode === OnboardingCompletionMode.AUTOMATIC) {
        throw new ForbiddenException('Este paso se completa automaticamente.');
      }

      const isPhaseLocked = await this.isStepPhaseLockedForStudent(
        studentId,
        stepId,
      );
      if (isPhaseLocked) {
        throw new ForbiddenException(
          'Debes completar la fase anterior antes de avanzar.',
        );
      }
    }

    const completionSource = this.getCompletionSourceForRole(actor.role);
    const currentStatus = await this.prisma.onboardingStepStatus.findUnique({
      where: {
        studentId_stepId: {
          studentId,
          stepId,
        },
      },
    });

    await this.prisma.onboardingStepStatus.upsert({
      where: {
        studentId_stepId: {
          studentId,
          stepId,
        },
      },
      update: {
        isCompleted,
        completedAt: isCompleted
          ? (currentStatus?.completedAt ?? new Date())
          : null,
        completionSource: isCompleted ? completionSource : null,
        completedByUserId: isCompleted ? actor.sub : null,
        notes: dto.notes ?? null,
      },
      create: {
        studentId,
        stepId,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        completionSource: isCompleted ? completionSource : null,
        completedByUserId: isCompleted ? actor.sub : null,
        notes: dto.notes ?? null,
      },
    });

    await this.syncLinkedChallenge(step, studentId, isCompleted);

    return this.buildStudentRoadmap(studentId);
  }

  private async buildStudentRoadmap(studentId: string) {
    await this.syncAutomaticStatuses(studentId);

    const [student, roadmap, statuses] = await Promise.all([
      this.prisma.studentProfile.findUniqueOrThrow({
        where: { id: studentId },
        include: {
          user: true,
          mentorAssignments: {
            include: {
              mentor: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      }),
      this.getActiveRoadmapOrThrow(false),
      this.prisma.onboardingStepStatus.findMany({
        where: { studentId },
        include: {
          completedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
    ]);

    const statusByStepId = new Map(
      statuses.map((status) => [status.stepId, status]),
    );
    const activePhases = roadmap.phases.filter((phase) => phase.isActive);
    let previousPhaseCompleted = true;
    const serializedPhases = activePhases.map((phase) => {
      const activeSteps = phase.steps
        .filter((step) => step.isActive)
        .sort((left, right) => left.sortOrder - right.sortOrder);
      const completedSteps = activeSteps.filter(
        (step) => statusByStepId.get(step.id)?.isCompleted,
      ).length;
      const countableSteps = activeSteps.filter(
        (step) => step.countsForProgress && !step.isOptional,
      );
      const completedCountableSteps = countableSteps.filter(
        (step) => statusByStepId.get(step.id)?.isCompleted,
      ).length;
      const percentage =
        countableSteps.length > 0
          ? Math.round((completedCountableSteps / countableSteps.length) * 100)
          : activeSteps.length > 0 && completedSteps === activeSteps.length
            ? 100
            : 0;
      const phaseStatus =
        completedSteps === 0
          ? 'NOT_STARTED'
          : completedSteps === activeSteps.length
            ? 'COMPLETED'
            : 'IN_PROGRESS';
      const isLocked = !previousPhaseCompleted;

      if (phaseStatus !== 'COMPLETED') {
        previousPhaseCompleted = false;
      }

      return {
        id: phase.id,
        title: phase.title,
        description: phase.description,
        sortOrder: phase.sortOrder,
        status: phaseStatus,
        isLocked,
        totalSteps: activeSteps.length,
        completedSteps,
        pendingSteps: Math.max(0, activeSteps.length - completedSteps),
        progressPercentage: percentage,
        steps: activeSteps.map((step) => {
          const status = statusByStepId.get(step.id);
          const studentFacingCompletionMode =
            step.completionMode === OnboardingCompletionMode.AUTOMATIC
              ? OnboardingCompletionMode.AUTOMATIC
              : OnboardingCompletionMode.SELF_SERVICE;

          return {
            id: step.id,
            title: step.title,
            description: step.description,
            locationHint: step.locationHint,
            notesInternal: step.notesInternal,
            sortOrder: step.sortOrder,
            stepKind: step.stepKind,
            completionMode: studentFacingCompletionMode,
            automationKey: step.automationKey,
            isActive: step.isActive,
            isOptional: step.isOptional,
            countsForProgress: step.countsForProgress,
            isCompleted: status?.isCompleted ?? false,
            completedAt: status?.completedAt ?? null,
            completionSource: status?.completionSource ?? null,
            completedBy: status?.completedByUser
              ? {
                  id: status.completedByUser.id,
                  name: `${status.completedByUser.firstName} ${status.completedByUser.lastName}`.trim(),
                  role: status.completedByUser.role,
                }
              : null,
            notes: status?.notes ?? null,
            canStudentComplete:
              studentFacingCompletionMode ===
                OnboardingCompletionMode.SELF_SERVICE && !isLocked,
            resources: step.resources
              .slice()
              .sort((left, right) => left.sortOrder - right.sortOrder)
              .map((resource) => ({
                id: resource.id,
                label: resource.label,
                url: resource.url,
                sortOrder: resource.sortOrder,
              })),
            challenge: step.challenge
              ? {
                  id: step.challenge.id,
                  title: step.challenge.title,
                  iconKey: step.challenge.iconKey,
                  rewardTitle: step.challenge.rewardTitle,
                  rewardUrl: step.challenge.rewardUrl,
                  metricDefinition: step.challenge.metricDefinition
                    ? {
                        id: step.challenge.metricDefinition.id,
                        name: step.challenge.metricDefinition.name,
                        slug: step.challenge.metricDefinition.slug,
                      }
                    : null,
                }
              : null,
          };
        }),
      };
    });

    const flatSteps = serializedPhases.flatMap((phase) =>
      phase.steps.map((step) => ({
        ...step,
        phaseId: phase.id,
        phaseTitle: phase.title,
      })),
    );
    const countableSteps = flatSteps.filter(
      (step) => step.countsForProgress && !step.isOptional,
    );
    const completedCountableSteps = countableSteps.filter(
      (step) => step.isCompleted,
    ).length;
    const unlockedSteps = flatSteps.filter(
      (step) =>
        serializedPhases.find((phase) => phase.id === step.phaseId)
          ?.isLocked !== true,
    );
    const nextRequiredStep =
      unlockedSteps.find((step) => !step.isCompleted && !step.isOptional) ??
      unlockedSteps.find((step) => !step.isCompleted) ??
      null;
    const completedTimestamps = flatSteps
      .map((step) => step.completedAt)
      .filter((value): value is Date => value instanceof Date)
      .map((value) => new Date(value).getTime());
    const lastProgressAt =
      completedTimestamps.length > 0
        ? new Date(Math.max(...completedTimestamps)).toISOString()
        : null;
    const totalSteps = flatSteps.length;
    const completedSteps = flatSteps.filter((step) => step.isCompleted).length;

    return {
      student: {
        id: student.id,
        userId: student.userId,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        email: student.user.email,
        status: student.user.status,
        country: student.country,
        timezone: student.timezone,
        mentors: student.mentorAssignments.map((assignment) => ({
          id: assignment.mentor.id,
          name: `${assignment.mentor.user.firstName} ${assignment.mentor.user.lastName}`.trim(),
          email: assignment.mentor.user.email,
        })),
      },
      roadmap: {
        id: roadmap.id,
        slug: roadmap.slug,
        title: roadmap.title,
        description: roadmap.description,
      },
      summary: {
        totalSteps,
        completedSteps,
        pendingSteps: Math.max(0, totalSteps - completedSteps),
        totalCountableSteps: countableSteps.length,
        completedCountableSteps,
        progressPercentage:
          countableSteps.length > 0
            ? Math.round(
                (completedCountableSteps / countableSteps.length) * 100,
              )
            : totalSteps > 0 && completedSteps === totalSteps
              ? 100
              : 0,
        currentPhaseTitle: nextRequiredStep?.phaseTitle ?? null,
        nextStep: nextRequiredStep
          ? {
              id: nextRequiredStep.id,
              title: nextRequiredStep.title,
              phaseTitle: nextRequiredStep.phaseTitle,
              stepKind: nextRequiredStep.stepKind,
              completionMode: nextRequiredStep.completionMode,
            }
          : null,
        lastProgressAt,
        isCompleted: totalSteps > 0 && completedSteps === totalSteps,
      },
      phases: serializedPhases,
    };
  }

  private async buildBatchStudentSummaries(
    students: Array<{
      id: string;
      userId: string;
      country: string | null;
      timezone: string | null;
      user: {
        firstName: string;
        lastName: string;
        email: string;
        status: UserStatus;
      };
    }>,
  ) {
    if (students.length === 0) {
      return [];
    }

    const studentIds = students.map((s) => s.id);

    const [roadmap, allStatuses] = await Promise.all([
      this.getActiveRoadmapOrThrow(false),
      this.prisma.onboardingStepStatus.findMany({
        where: { studentId: { in: studentIds } },
        select: {
          studentId: true,
          stepId: true,
          isCompleted: true,
          completedAt: true,
        },
      }),
    ]);

    const statusesByStudent = new Map<
      string,
      Array<{ stepId: string; isCompleted: boolean; completedAt: Date | null }>
    >();
    for (const status of allStatuses) {
      if (!statusesByStudent.has(status.studentId)) {
        statusesByStudent.set(status.studentId, []);
      }
      statusesByStudent.get(status.studentId)!.push(status);
    }

    const activePhases = roadmap.phases.filter((p) => p.isActive);
    const activeStepsFlat = activePhases.flatMap((phase) =>
      phase.steps
        .filter((s) => s.isActive)
        .sort((l, r) => l.sortOrder - r.sortOrder)
        .map((s) => ({
          id: s.id,
          title: s.title,
          isOptional: s.isOptional,
          countsForProgress: s.countsForProgress,
          phaseId: phase.id,
          phaseTitle: phase.title,
        })),
    );
    const countableSteps = activeStepsFlat.filter(
      (s) => s.countsForProgress && !s.isOptional,
    );

    return students.map((student) => {
      const statuses = statusesByStudent.get(student.id) ?? [];
      const completedStepIds = new Set(
        statuses.filter((s) => s.isCompleted).map((s) => s.stepId),
      );

      const completedSteps = activeStepsFlat.filter((s) =>
        completedStepIds.has(s.id),
      ).length;
      const completedCountableSteps = countableSteps.filter((s) =>
        completedStepIds.has(s.id),
      ).length;
      const totalSteps = activeStepsFlat.length;

      const progressPercentage =
        countableSteps.length > 0
          ? Math.round((completedCountableSteps / countableSteps.length) * 100)
          : totalSteps > 0 && completedSteps === totalSteps
            ? 100
            : 0;

      const nextStep =
        activeStepsFlat.find(
          (s) => !completedStepIds.has(s.id) && !s.isOptional,
        ) ??
        activeStepsFlat.find((s) => !completedStepIds.has(s.id)) ??
        null;

      const completedTimestamps = statuses
        .filter((s) => s.isCompleted && s.completedAt instanceof Date)
        .map((s) => new Date(s.completedAt!).getTime());
      const lastProgressAt =
        completedTimestamps.length > 0
          ? new Date(Math.max(...completedTimestamps)).toISOString()
          : null;

      const phases = activePhases.map((phase) => {
        const phaseSteps = phase.steps.filter((s) => s.isActive);
        const phaseCompleted = phaseSteps.filter((s) =>
          completedStepIds.has(s.id),
        ).length;
        const phaseCountable = phaseSteps.filter(
          (s) => s.countsForProgress && !s.isOptional,
        );
        const phaseCompletedCountable = phaseCountable.filter((s) =>
          completedStepIds.has(s.id),
        ).length;
        const phasePercentage =
          phaseCountable.length > 0
            ? Math.round(
                (phaseCompletedCountable / phaseCountable.length) * 100,
              )
            : phaseSteps.length > 0 && phaseCompleted === phaseSteps.length
              ? 100
              : 0;

        return {
          id: phase.id,
          title: phase.title,
          status:
            phaseCompleted === 0
              ? 'NOT_STARTED'
              : phaseCompleted === phaseSteps.length
                ? 'COMPLETED'
                : 'IN_PROGRESS',
          progressPercentage: phasePercentage,
          completedSteps: phaseCompleted,
          pendingSteps: Math.max(0, phaseSteps.length - phaseCompleted),
        };
      });

      return {
        student: {
          id: student.id,
          userId: student.userId,
          firstName: student.user.firstName,
          lastName: student.user.lastName,
          email: student.user.email,
          status: student.user.status,
          country: student.country,
          timezone: student.timezone,
        },
        summary: {
          progressPercentage,
          completedSteps,
          pendingSteps: Math.max(0, totalSteps - completedSteps),
          currentPhaseTitle: nextStep?.phaseTitle ?? null,
          nextStepTitle: nextStep?.title ?? null,
          lastProgressAt,
          isCompleted: totalSteps > 0 && completedSteps === totalSteps,
        },
        phases,
      };
    });
  }

  private serializeAdminRoadmap(roadmap: RoadmapWithRelations) {
    return {
      roadmap: {
        id: roadmap.id,
        slug: roadmap.slug,
        title: roadmap.title,
        description: roadmap.description,
        isActive: roadmap.isActive,
      },
      phases: roadmap.phases
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((phase) => ({
          id: phase.id,
          title: phase.title,
          description: phase.description,
          notesInternal: phase.notesInternal,
          sortOrder: phase.sortOrder,
          isActive: phase.isActive,
          countsForProgress: phase.countsForProgress,
          steps: phase.steps
            .slice()
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((step) => ({
              id: step.id,
              phaseId: step.phaseId,
              title: step.title,
              description: step.description,
              locationHint: step.locationHint,
              notesInternal: step.notesInternal,
              stepKind: step.stepKind,
              completionMode: step.completionMode,
              automationKey: step.automationKey,
              sortOrder: step.sortOrder,
              isActive: step.isActive,
              isOptional: step.isOptional,
              countsForProgress: step.countsForProgress,
              challengeId: step.challengeId,
              challenge: step.challenge
                ? {
                    id: step.challenge.id,
                    title: step.challenge.title,
                    iconKey: step.challenge.iconKey,
                  }
                : null,
              resources: step.resources
                .slice()
                .sort((left, right) => left.sortOrder - right.sortOrder)
                .map((resource) => ({
                  id: resource.id,
                  label: resource.label,
                  url: resource.url,
                  sortOrder: resource.sortOrder,
                })),
            })),
        })),
    };
  }

  private async syncAutomaticStatuses(studentId: string) {
    const [roadmap, student] = await Promise.all([
      this.getActiveRoadmapOrThrow(false),
      this.prisma.studentProfile.findUnique({
        where: { id: studentId },
        include: {
          monthlyPeriods: {
            select: {
              status: true,
            },
          },
        },
      }),
    ]);

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const automaticSteps = roadmap.phases
      .filter((phase) => phase.isActive)
      .flatMap((phase) => phase.steps)
      .filter(
        (step) =>
          step.isActive &&
          step.completionMode === OnboardingCompletionMode.AUTOMATIC &&
          step.automationKey,
      );

    for (const step of automaticSteps) {
      const shouldBeCompleted = this.evaluateAutomationKey(
        step.automationKey,
        student,
      );
      const existingStatus = await this.prisma.onboardingStepStatus.findUnique({
        where: {
          studentId_stepId: {
            studentId,
            stepId: step.id,
          },
        },
      });

      await this.prisma.onboardingStepStatus.upsert({
        where: {
          studentId_stepId: {
            studentId,
            stepId: step.id,
          },
        },
        update: {
          isCompleted: shouldBeCompleted,
          completedAt: shouldBeCompleted
            ? (existingStatus?.completedAt ?? new Date())
            : null,
          completionSource: shouldBeCompleted
            ? OnboardingCompletionSource.SYSTEM
            : null,
          completedByUserId: null,
        },
        create: {
          studentId,
          stepId: step.id,
          isCompleted: shouldBeCompleted,
          completedAt: shouldBeCompleted ? new Date() : null,
          completionSource: shouldBeCompleted
            ? OnboardingCompletionSource.SYSTEM
            : null,
          completedByUserId: null,
        },
      });
    }
  }

  private evaluateAutomationKey(
    automationKey: OnboardingAutomationKey | null,
    student: {
      userId: string;
      country: string | null;
      localCurrencyId: string | null;
      monthlyPeriods: Array<{ status: MonthlyMetricPeriodStatus }>;
    },
  ) {
    if (automationKey === OnboardingAutomationKey.STUDENT_ACCOUNT_CREATED) {
      return Boolean(student.userId);
    }

    if (automationKey === OnboardingAutomationKey.INITIAL_PROFILE_COMPLETED) {
      return Boolean(student.country && student.localCurrencyId);
    }

    if (
      automationKey === OnboardingAutomationKey.FIRST_METRIC_PERIOD_SUBMITTED
    ) {
      return student.monthlyPeriods.some(
        (period) =>
          period.status === MonthlyMetricPeriodStatus.SUBMITTED ||
          period.status === MonthlyMetricPeriodStatus.CLOSED,
      );
    }

    return false;
  }

  private async syncLinkedChallenge(
    step: Awaited<ReturnType<OnboardingService['findStepByIdOrThrow']>>,
    studentId: string,
    isCompleted: boolean,
  ) {
    if (!step.challengeId || !step.challenge) {
      return;
    }

    if (
      step.challenge.metricDefinitionId ||
      step.challenge.targetValue !== null
    ) {
      return;
    }

    if (isCompleted) {
      await this.prisma.studentChallenge.upsert({
        where: {
          studentId_challengeId: { studentId, challengeId: step.challengeId },
        },
        update: { status: ChallengeStatus.COMPLETED },
        create: {
          studentId,
          challengeId: step.challengeId,
          status: ChallengeStatus.COMPLETED,
        },
      });
      return;
    }

    await this.prisma.studentChallenge.updateMany({
      where: {
        studentId,
        challengeId: step.challengeId,
        status: ChallengeStatus.COMPLETED,
      },
      data: { status: ChallengeStatus.ASSIGNED },
    });
  }

  private async resolveStepStatusStudentId(
    requestedStudentId: string | undefined,
    actor: AuthenticatedUser,
  ) {
    if (actor.role === UserRole.STUDENT) {
      return (await this.studentsService.getOwnProfile(actor.sub)).id;
    }

    if (!requestedStudentId) {
      throw new ConflictException(
        'studentId is required for mentor and admin actions',
      );
    }

    await this.ensureAccessibleStudent(requestedStudentId, actor);
    return requestedStudentId;
  }

  private async ensureAccessibleStudent(
    studentId: string,
    actor: AuthenticatedUser,
  ) {
    if (actor.role === UserRole.ADMIN) {
      return this.studentsService.findByIdOrThrow(studentId);
    }

    if (actor.role === UserRole.MENTOR) {
      return this.studentsService.findAccessibleByIdOrThrow(studentId, actor);
    }

    const student = await this.studentsService.getOwnProfile(actor.sub);
    if (student.id !== studentId) {
      throw new ForbiddenException(
        'You can only access your own onboarding roadmap',
      );
    }

    return student;
  }

  private getCompletionSourceForRole(role: UserRole) {
    if (role === UserRole.ADMIN) {
      return OnboardingCompletionSource.ADMIN;
    }

    if (role === UserRole.MENTOR) {
      return OnboardingCompletionSource.MENTOR;
    }

    return OnboardingCompletionSource.STUDENT;
  }

  private async getActiveRoadmapOrThrow(includeInactiveChildren: boolean) {
    const roadmap = await this.prisma.onboardingRoadmap.findFirst({
      where: { isActive: true },
      include: {
        phases: {
          where: includeInactiveChildren ? undefined : { isActive: true },
          include: {
            steps: {
              where: includeInactiveChildren ? undefined : { isActive: true },
              include: {
                resources: true,
                challenge: {
                  include: {
                    metricDefinition: true,
                  },
                },
              },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    if (!roadmap) {
      throw new NotFoundException('Onboarding roadmap not found');
    }

    return roadmap;
  }

  private async findPhaseByIdOrThrow(phaseId: string) {
    const phase = await this.prisma.onboardingPhase.findUnique({
      where: { id: phaseId },
    });

    if (!phase) {
      throw new NotFoundException('Onboarding phase not found');
    }

    return phase;
  }

  private async findStepByIdOrThrow(stepId: string) {
    const step = await this.prisma.onboardingStep.findUnique({
      where: { id: stepId },
      include: {
        challenge: true,
        phase: true,
      },
    });

    if (!step) {
      throw new NotFoundException('Onboarding step not found');
    }

    return step;
  }

  private async isStepPhaseLockedForStudent(studentId: string, stepId: string) {
    const roadmap = await this.buildStudentRoadmap(studentId);
    const phaseIndex = roadmap.phases.findIndex((phase) =>
      phase.steps.some((step) => step.id === stepId),
    );

    if (phaseIndex <= 0) {
      return false;
    }

    return roadmap.phases[phaseIndex]?.isLocked === true;
  }

  private async ensureChallengeExists(challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    return challenge;
  }
}
