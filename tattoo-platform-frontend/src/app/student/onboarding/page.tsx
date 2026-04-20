import { AppShell } from '@/components/app-shell';
import { StudentOnboardingRoadmap } from '@/components/student-onboarding-roadmap';
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
    safeBackendFetch<StudentOnboardingRoadmapData | null>(
      '/onboarding/me',
      null,
      {
        token: session.token,
      },
      'student onboarding roadmap',
    ),
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
      {roadmap ? (
        <StudentOnboardingRoadmap initialData={roadmap} />
      ) : (
        <section className="onboarding-student-shell">
          <header className="onboarding-student-hero">
            <div className="onboarding-student-hero-copy">
              <p className="eyebrow">Roadmap de mentoria</p>
              <h1>On boarding</h1>
              <p>
                No pudimos cargar tu roadmap en este momento. Puede pasar si el onboarding
                todavia no esta configurado o si hubo un problema temporal con el backend.
              </p>
            </div>
          </header>

          <article className="summary-card onboarding-student-summary-card onboarding-student-summary-card-accent">
            <span>Estado</span>
            <strong>Roadmap no disponible</strong>
            <p>Prueba recargando en unos minutos o revisa el setup inicial mientras tanto.</p>
          </article>
        </section>
      )}
    </AppShell>
  );
}
