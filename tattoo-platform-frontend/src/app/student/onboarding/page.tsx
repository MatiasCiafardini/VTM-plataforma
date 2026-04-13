import { AppShell } from '@/components/app-shell';
import { StudentOnboardingForm } from '@/components/student-onboarding-form';
import { backendFetch } from '@/lib/backend';
import { safeBackendFetch } from '@/lib/server-fetch';
import { requireRole } from '@/lib/session';

type Currency = {
  id: string;
  code: string;
  symbol: string | null;
};

type StudentOwnProfile = {
  country: string | null;
  instagramHandle: string | null;
  localCurrency: Currency | null;
};

type MetricDefinition = {
  id: string;
  slug: string;
  valueType: 'INTEGER' | 'DECIMAL' | 'CURRENCY' | 'TEXT' | 'BOOLEAN';
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
  const [profile, currencies, metricDefinitions, notifications] = await Promise.all([
    backendFetch<StudentOwnProfile>('/students/me', {
      token: session.token,
    }),
    backendFetch<Currency[]>('/currency/currencies', {
      token: session.token,
    }),
    backendFetch<MetricDefinition[]>('/metrics/definitions?includeInactive=false', {
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
      activeNav="profile"
      showSectionEyebrow={false}
      notifications={notifications}
    >
      <StudentOnboardingForm
        profile={profile}
        currencies={currencies}
        metricDefinitions={metricDefinitions}
      />
    </AppShell>
  );
}
