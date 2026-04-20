import { AdminAchievementsWall } from '@/components/admin-achievements-wall';
import { AdminStudentManagement } from '@/components/admin-student-management';
import { AdminProfilePanel } from '@/components/admin-profile-panel';
import { AdminChallengesPanel } from '@/components/admin-challenges-panel';
import { AdminOperationsPanel } from '@/components/admin-operations-panel';
import { AppShell } from '@/components/app-shell';
import {
  EMBEDDED_TOOLS,
  EXTERNAL_TOOLS,
  EmbeddedToolEmbed,
  EmbeddedToolPromo,
  ExternalToolPromo,
} from '@/components/embedded-tool';
import { formatCompactNumber } from '@/components/dashboard-utils';
import { backendFetch } from '@/lib/backend';
import { safeBackendFetch } from '@/lib/server-fetch';
import { requireRole } from '@/lib/session';

type TabKey =
  | 'dashboard'
  | 'results'
  | 'challenges'
  | 'analyzer'
  | 'followups'
  | 'profile'
  | 'settings';

type AdminDashboard = {
  metricLabels: {
    revenue: string;
    leads: string;
    closures: string;
  };
  summary: {
    totalStudents: number;
    activeStudents: number;
    inactiveStudents: number;
    totalMentors: number;
    totalPeriods: number;
    periodsDraft: number;
    periodsSubmitted: number;
    periodsClosed: number;
    studentsNeedingAttention: number;
    activeGoals: number;
    activeChallenges: number;
    activeRewards: number;
    upcomingEvents: number;
    totalRevenueHistorical: number;
    totalRevenueLatestMonth: number;
    averageProgress: number;
  };
  studentOverview: Array<{
    studentId: string;
    name: string;
    email: string;
    country: string | null;
    userStatus: string;
    latestPeriodStatus: string | null;
    latestPeriodMonth: number | null;
    latestPeriodYear: number | null;
    latestRevenue: number | null;
    attentionLevel: string | null;
    attentionScore: number | null;
    riskSummary: {
      headline: string;
      items: string[];
    };
    revenueHistory: Array<{
      id: string;
      month: number;
      year: number;
      ingresosFacturacion: number | null;
    }>;
  }>;
  completedAchievements: Array<{
    id: string;
    completedAt: string;
    month: number;
    year: number;
    studentId: string;
    studentName: string;
    studentEmail: string;
    challengeId: string;
    challengeTitle: string;
    challengeDescription: string | null;
    difficultyStars: number;
    metricName: string;
    targetValue: number;
    currentValue: number;
  }>;
};

type StudentDashboardQuickLink = {
  id: string;
  title: string;
  url: string;
  sortOrder?: number;
};

type Currency = {
  id: string;
  code: string;
  name?: string;
  symbol: string | null;
};

type AdminOwnProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  adminProfile: {
    nationality: string | null;
    country: string | null;
    birthDate: string | null;
    startDate: string | null;
    localCurrency: Currency | null;
  } | null;
};

type ChallengeTemplate = {
  id: string;
  title: string;
  description: string | null;
  iconKey: string;
  rewardTitle: string | null;
  rewardUrl: string | null;
  targetValue: number | null;
  difficultyStars: number;
  isActive: boolean;
  metricDefinition: {
    id: string;
    name: string;
    slug: string;
    valueType: 'INTEGER' | 'DECIMAL' | 'CURRENCY' | 'TEXT' | 'BOOLEAN';
  } | null;
  prerequisiteChallenge: {
    id: string;
    title: string;
    difficultyStars: number;
    iconKey: string;
  } | null;
};

type MetricDefinition = {
  id: string;
  name: string;
  slug: string;
  valueType: 'INTEGER' | 'DECIMAL' | 'CURRENCY' | 'TEXT' | 'BOOLEAN';
};

type AdminSettings = {
  userOperations: {
    defaultStudentStatus: 'ACTIVE' | 'INACTIVE';
    defaultMentorStatus: 'ACTIVE' | 'INACTIVE';
    inactivityThresholdDays: number;
    goodStandingLabel: string;
    riskStandingLabel: string;
    studentRegistrationCode: string;
  };
  metrics: {
    revenueMetricSlug: string;
    leadsMetricSlug: string;
    closuresMetricSlug: string;
    noMetricsWeight: number;
    incomeDropWeight: number;
    leadsDropWeight: number;
    closuresDropWeight: number;
    goalsMissedWeight: number;
    inactivityWeight: number;
    warningThreshold: number;
    riskThreshold: number;
    inactivityDays: number;
    staleDraftDays: number;
  };
  notifications: {
    monthEndReminderDay: number;
    remindStudentsForPendingMetrics: boolean;
    remindAdminsForPendingMetrics: boolean;
    notifyStudentOnAchievement: boolean;
    notifyAdminsOnAchievement: boolean;
    notifyAdminsOnRisk: boolean;
  };
};

type GroupMeeting = {
  id: string;
  title: string;
  description: string | null;
  timezone: string;
  isRecurring: boolean;
  weekDay: number | null;
  startsAt: string;
  endsAt: string | null;
  linkUrl: string | null;
};

type RegistrationCode = {
  id: string;
  code: string;
  label: string | null;
  role: 'ADMIN' | 'MENTOR' | 'STUDENT';
  isActive: boolean;
  usageCount: number;
  maxUses: number | null;
  createdAt: string;
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  student?: {
    user?: {
      firstName: string;
      lastName: string;
      email: string;
    };
  } | null;
};

function resolveTab(tab?: string): TabKey {
  if (
    tab === 'results' ||
    tab === 'challenges' ||
    tab === 'analyzer' ||
    tab === 'followups' ||
    tab === 'profile' ||
    tab === 'settings'
  ) {
    return tab;
  }

  return 'dashboard';
}

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function getAttentionPriority(student: AdminDashboard['studentOverview'][number]) {
  if (student.latestPeriodStatus === null) return 0;
  if (student.attentionLevel === 'RED') return 1;
  if (student.attentionLevel === 'YELLOW') return 2;
  return 3;
}

function getAttentionBadge(student: AdminDashboard['studentOverview'][number]) {
  if (student.latestPeriodStatus === null) {
    return 'Sin registros';
  }

  if (student.attentionLevel === 'RED') {
    return `Score ${student.attentionScore ?? 0}`;
  }

  if (student.attentionLevel === 'YELLOW') {
    return `Revisar ${student.attentionScore ?? 0}`;
  }

  return 'En seguimiento';
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; q?: string; view?: string }>;
}) {
  const session = await requireRole('ADMIN');
  const params = searchParams ? await searchParams : undefined;
  const activeTab = resolveTab(params?.tab);
  const challengesView = params?.view === 'manage' ? 'manage' : 'wall';
  const [data, studentDashboardLinks, challengeTemplates, metricDefinitions, adminSettings, groupMeetings, registrationCodes, notifications, adminProfile, currencies] = await Promise.all([
    activeTab === 'dashboard' ||
    activeTab === 'results' ||
    (activeTab === 'challenges' && challengesView === 'wall')
      ? backendFetch<AdminDashboard>('/dashboard/admin', {
          token: session.token,
        })
      : Promise.resolve(null),
    activeTab === 'profile'
      ? backendFetch<StudentDashboardQuickLink[]>('/student-dashboard-links', {
          token: session.token,
        })
      : Promise.resolve([]),
    activeTab === 'challenges'
      ? backendFetch<ChallengeTemplate[]>('/challenges', {
          token: session.token,
        })
      : Promise.resolve([]),
    activeTab === 'challenges'
      ? backendFetch<MetricDefinition[]>('/metrics/definitions?includeInactive=false', {
          token: session.token,
        })
      : Promise.resolve([]),
    activeTab === 'settings'
      ? safeBackendFetch<AdminSettings | null>(
          '/admin-settings',
          null,
          {
            token: session.token,
          },
          'admin settings',
        )
      : Promise.resolve(null),
    activeTab === 'settings'
      ? safeBackendFetch<GroupMeeting[]>(
          '/group-meetings',
          [],
          {
            token: session.token,
          },
          'group meetings',
        )
      : Promise.resolve([]),
    activeTab === 'settings'
      ? safeBackendFetch<RegistrationCode[]>(
          '/registration-codes',
          [],
          {
            token: session.token,
          },
          'registration codes',
        )
      : Promise.resolve([]),
    safeBackendFetch<NotificationItem[]>(
      '/notifications',
      [],
      {
        token: session.token,
      },
      'admin notifications',
    ),
    activeTab === 'profile'
      ? backendFetch<AdminOwnProfile>('/users/me', {
          token: session.token,
        })
      : Promise.resolve(null),
    activeTab === 'profile'
      ? backendFetch<Currency[]>('/currency/currencies', {
          token: session.token,
        })
      : Promise.resolve([]),
  ]);
  const studentsNeedingAttention = [...(data?.studentOverview ?? [])]
    .sort((left, right) => {
      const leftPriority = getAttentionPriority(left);
      const rightPriority = getAttentionPriority(right);

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return (right.attentionScore ?? 0) - (left.attentionScore ?? 0);
    })
    .slice(0, 6);

  return (
    <AppShell
      title={
        activeTab === 'dashboard' ? (
          <>
            Panel de <span className="dashboard-headline-accent">Mentores</span>
          </>
        ) : activeTab === 'results' ? (
          ''
        ) : activeTab === 'challenges' ? (
          ''
        ) : activeTab === 'analyzer' ? (
          ''
        ) : activeTab === 'followups' ? (
          ''
        ) : activeTab === 'profile' ? (
          ''
        ) : activeTab === 'settings' ? (
          ''
        ) : (
          'Dashboard general'
        )
      }
      subtitle={
        activeTab === 'dashboard'
          ? 'Control global de los alumnos'
          : activeTab === 'results'
            ? ''
            : activeTab === 'challenges'
              ? ''
            : activeTab === 'analyzer'
              ? ''
            : activeTab === 'followups'
              ? ''
            : activeTab === 'profile'
              ? ''
            : activeTab === 'settings'
              ? ''
            : 'Vision global de alumnos, alertas, modulos activos y carga operativa.'
      }
      role={session.role}
      displayName={session.displayName}
      activeNav={activeTab}
      showSectionEyebrow={false}
      notifications={notifications}
    >
      {activeTab !== 'dashboard' &&
      activeTab !== 'results' &&
      activeTab !== 'analyzer' &&
      activeTab !== 'followups' &&
      activeTab !== 'profile' &&
      activeTab !== 'challenges' ? (
        <section className="dashboard-headline mentor-secondary-headline">
          <div>
            <h3 className="dashboard-headline-title">
              <>
                Configuracion, <span>operativa</span>
              </>
            </h3>
            <p className="dashboard-headline-copy">
              Reglas del sistema para usuarios, metricas, riesgo y notificaciones.
            </p>
          </div>
        </section>
      ) : null}

      {activeTab === 'dashboard' && data ? (
        <>
          <section className="mentor-hero-card">
            <p className="mentor-hero-label">Suma historica total</p>
            <div className="mentor-hero-value-row">
              <span className="mentor-hero-currency">$</span>
              <strong>{formatCurrency(data.summary.totalRevenueHistorical)}</strong>
            </div>
            <p className="mentor-hero-caption">
              Acumulado global de {data.metricLabels.revenue.toLowerCase()} de todos los alumnos
              (USD)
            </p>
          </section>

          <section className="mentor-stats-grid">
            <article className="summary-card metric-card mentor-stat-card">
              <div className="metric-card-top">
                <span>Total alumnos</span>
                <span className="metric-card-icon">#</span>
              </div>
              <strong>{data.summary.totalStudents}</strong>
              <p>Registrados</p>
            </article>
            <article className="summary-card metric-card mentor-stat-card">
              <div className="metric-card-top">
                <span>Activos</span>
                <span className="metric-card-icon">/</span>
              </div>
              <strong>{data.summary.activeStudents}</strong>
              <p>Con datos recientes</p>
            </article>
            <article className="summary-card metric-card mentor-stat-card">
              <div className="metric-card-top">
                <span>Progreso promedio</span>
                <span className="metric-card-icon">%</span>
              </div>
              <strong>{data.summary.averageProgress}%</strong>
              <p>Crecimiento acumulado</p>
            </article>
            <article className="summary-card metric-card mentor-stat-card">
              <div className="metric-card-top">
                <span>{data.metricLabels.revenue}</span>
                <span className="metric-card-icon">$</span>
              </div>
              <strong>{formatCurrency(data.summary.totalRevenueLatestMonth)}</strong>
              <p>Ultimo mes registrado (USD)</p>
            </article>
          </section>

          <article className="list-card mentor-attention-card">
            <div className="mentor-attention-header">
              <p className="eyebrow mentor-alert-eyebrow">Alumnos que Necesitan Atencion</p>
              <span className="mentor-attention-meta">
                {formatCompactNumber(data.summary.studentsNeedingAttention)} alertas activas
              </span>
            </div>
            <div className="mentor-attention-list">
              {studentsNeedingAttention.map((student) => (
                <div className="mentor-attention-row" key={student.studentId}>
                  <div>
                    <strong>{student.name}</strong>
                    <p>{student.email}</p>
                  </div>
                  <span
                    className={
                      student.attentionLevel === 'RED' || student.latestPeriodStatus === null
                        ? 'mentor-attention-badge mentor-attention-badge-danger'
                        : student.attentionLevel === 'YELLOW'
                          ? 'mentor-attention-badge mentor-attention-badge-warn'
                          : 'mentor-attention-badge'
                    }
                  >
                    {getAttentionBadge(student)}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <section className="section-heading">
            <h3>Herramientas</h3>
          </section>

          <section className="tools-grid">
            <EmbeddedToolPromo href="/admin?tab=analyzer" tool={EMBEDDED_TOOLS.analyzer} />
            <EmbeddedToolPromo href="/admin?tab=followups" tool={EMBEDDED_TOOLS.followups} />
          </section>

          <section className="tools-grid">
            <ExternalToolPromo tool={EXTERNAL_TOOLS['mentoring-videos']} />
            <ExternalToolPromo tool={EXTERNAL_TOOLS['sales-simulator']} />
          </section>
        </>
      ) : null}

      {activeTab === 'results' && data ? (
        <AdminStudentManagement
          students={data.studentOverview}
          initialQuery={params?.q ?? ''}
          revenueLabel={data.metricLabels.revenue}
        />
      ) : null}

      {activeTab === 'challenges' ? (
        challengesView === 'manage' ? (
          <AdminChallengesPanel
            initialChallenges={challengeTemplates}
            metricDefinitions={metricDefinitions}
          />
        ) : data ? (
          <AdminAchievementsWall achievements={data.completedAchievements} />
        ) : null
      ) : null}

      {activeTab === 'analyzer' ? (
        <EmbeddedToolEmbed
          dashboardHref="/admin?tab=dashboard"
          dashboardLabel="Volver al dashboard"
          tool={EMBEDDED_TOOLS.analyzer}
        />
      ) : null}

      {activeTab === 'followups' ? (
        <EmbeddedToolEmbed
          dashboardHref="/admin?tab=dashboard"
          dashboardLabel="Volver al dashboard"
          tool={EMBEDDED_TOOLS.followups}
        />
      ) : null}

      {activeTab === 'profile' && adminProfile ? (
        <AdminProfilePanel
          displayName={session.displayName}
          initialLinks={studentDashboardLinks}
          profile={adminProfile}
          currencies={currencies}
        />
      ) : null}

      {activeTab === 'settings' && adminSettings ? (
        <AdminOperationsPanel
          initialSettings={adminSettings}
          initialMeetings={groupMeetings}
          initialCodes={registrationCodes}
        />
      ) : activeTab === 'settings' ? (
        <article className="list-card">
          <p>No pudimos cargar la configuracion operativa en este momento.</p>
        </article>
      ) : null}
    </AppShell>
  );
}
