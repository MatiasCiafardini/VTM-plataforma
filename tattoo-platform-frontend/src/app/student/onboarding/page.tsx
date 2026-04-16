import { AppShell } from '@/components/app-shell';
import { StudentOnboardingRoadmap } from '@/components/student-onboarding-roadmap';
import { backendFetch } from '@/lib/backend';
import { safeBackendFetch } from '@/lib/server-fetch';
import { requireRole } from '@/lib/session';

type StudentOnboardingRoadmapData = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  roadmap: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
  };
  summary: {
    totalSteps: number;
    completedSteps: number;
    pendingSteps: number;
    progressPercentage: number;
    currentPhaseTitle: string | null;
    nextStep: {
      id: string;
      title: string;
      phaseTitle: string;
      stepKind: string;
      completionMode: string;
    } | null;
    lastProgressAt: string | null;
    isCompleted: boolean;
  };
  phases: Array<{
    id: string;
    title: string;
    description: string | null;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    isLocked: boolean;
    totalSteps: number;
    completedSteps: number;
    pendingSteps: number;
    progressPercentage: number;
    steps: Array<{
      id: string;
      title: string;
      description: string | null;
      locationHint: string | null;
      notesInternal: string | null;
      stepKind: 'CLASS' | 'MEETING' | 'RESOURCE' | 'ACTION_MANUAL';
      completionMode: 'SELF_SERVICE' | 'STAFF_ONLY' | 'AUTOMATIC';
      automationKey: string | null;
      sortOrder: number;
      isOptional: boolean;
      countsForProgress: boolean;
      isCompleted: boolean;
      completedAt: string | null;
      completionSource: string | null;
      canStudentComplete: boolean;
      resources: Array<{
        id: string;
        label: string;
        url: string;
      }>;
      challenge: {
        id: string;
        title: string;
        iconKey: string;
        rewardTitle: string | null;
        rewardUrl: string | null;
        metricDefinition: {
          id: string;
          name: string;
          slug: string;
        } | null;
      } | null;
    }>;
  }>;
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

export default async function StudentOnboardingPage() {
  const session = await requireRole('STUDENT');
  const [roadmap, notifications] = await Promise.all([
    backendFetch<StudentOnboardingRoadmapData>('/onboarding/me', {
      token: session.token,
    }),
    safeBackendFetch<NotificationItem[]>(
      '/notifications',
      [],
      {
        token: session.token,
      },
      'student notifications',
    ),
  ]);

  return (
    <AppShell
      title=""
      subtitle=""
      role={session.role}
      displayName={session.displayName}
      activeNav="onboarding"
      showSectionEyebrow={false}
      notifications={notifications}
    >
      <StudentOnboardingRoadmap initialData={roadmap} />
    </AppShell>
  );
}
