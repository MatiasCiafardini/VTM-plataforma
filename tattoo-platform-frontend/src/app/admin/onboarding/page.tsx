import { AdminOnboardingPanel } from '@/components/admin-onboarding-panel';
import { AppShell } from '@/components/app-shell';
import { type OnboardingStudentSummary } from '@/components/onboarding-progress-board';
import { backendFetch } from '@/lib/backend';
import { safeBackendFetch } from '@/lib/server-fetch';
import { requireRole } from '@/lib/session';

type AdminRoadmapData = {
  roadmap: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    isActive: boolean;
  };
  phases: Array<{
    id: string;
    title: string;
    description: string | null;
    notesInternal: string | null;
    sortOrder: number;
    isActive: boolean;
    countsForProgress: boolean;
    steps: Array<{
      id: string;
      phaseId: string;
      title: string;
      description: string | null;
      locationHint: string | null;
      notesInternal: string | null;
      stepKind: 'CLASS' | 'MEETING' | 'RESOURCE' | 'ACTION_MANUAL';
      completionMode: 'SELF_SERVICE' | 'STAFF_ONLY' | 'AUTOMATIC';
      automationKey: string | null;
      sortOrder: number;
      isActive: boolean;
      isOptional: boolean;
      countsForProgress: boolean;
      challengeId: string | null;
      challenge: {
        id: string;
        title: string;
        iconKey: string;
      } | null;
      resources: Array<{
        id: string;
        label: string;
        url: string;
        sortOrder: number;
      }>;
    }>;
  }>;
};

type ChallengeOption = {
  id: string;
  title: string;
  iconKey: string;
  metricDefinition: {
    id: string;
    name: string;
  } | null;
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

export default async function AdminOnboardingPage() {
  const session = await requireRole('ADMIN');
  const [roadmap, students, challenges, notifications] = await Promise.all([
    backendFetch<AdminRoadmapData>('/onboarding/admin/roadmap', {
      token: session.token,
    }),
    backendFetch<OnboardingStudentSummary[]>('/onboarding/admin/students', {
      token: session.token,
    }),
    backendFetch<ChallengeOption[]>('/challenges', {
      token: session.token,
    }),
    safeBackendFetch<NotificationItem[]>(
      '/notifications',
      [],
      {
        token: session.token,
      },
      'admin notifications',
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
      <AdminOnboardingPanel
        initialRoadmap={roadmap}
        students={students}
        challenges={challenges}
      />
    </AppShell>
  );
}
