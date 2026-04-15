import { AppShell } from '@/components/app-shell';
import {
  OnboardingProgressBoard,
  type OnboardingStudentSummary,
} from '@/components/onboarding-progress-board';
import { backendFetch } from '@/lib/backend';
import { safeBackendFetch } from '@/lib/server-fetch';
import { requireRole } from '@/lib/session';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

export default async function MentorOnboardingPage() {
  const session = await requireRole('MENTOR');
  const [students, notifications] = await Promise.all([
    backendFetch<OnboardingStudentSummary[]>('/onboarding/mentor/students', {
      token: session.token,
    }),
    safeBackendFetch<NotificationItem[]>(
      '/notifications',
      [],
      {
        token: session.token,
      },
      'mentor notifications',
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
      <OnboardingProgressBoard
        students={students}
        title="On boarding"
        subtitle="Vista rápida del roadmap de cada alumno asignado, con fase actual, siguiente paso y porcentaje de avance."
      />
    </AppShell>
  );
}
