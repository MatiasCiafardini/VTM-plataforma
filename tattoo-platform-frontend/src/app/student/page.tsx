import { AppShell } from '@/components/app-shell';
import {
  getStatusClass,
} from '@/components/dashboard-utils';
import { StudentResultsPanel } from '@/components/student-results-panel';
import { StudentChallengesPanel } from '@/components/student-challenges-panel';
import { StudentProfilePanel } from '@/components/student-profile-panel';
import { StudentWeekCalendar } from '@/components/student-week-calendar';
import { backendFetch } from '@/lib/backend';
import { safeBackendFetch } from '@/lib/server-fetch';
import { requireRole } from '@/lib/session';
import Link from 'next/link';

type TabKey = 'dashboard' | 'results' | 'challenges' | 'profile';

type StudentDashboard = {
  metricLabels: {
    revenue: string;
    leads: string;
    closures: string;
  };
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    country: string | null;
    displayCurrencyMode: 'LOCAL' | 'USD' | 'BOTH';
    localCurrency: {
      id: string;
      code: string;
      symbol: string | null;
    } | null;
  };
  summary: {
    totalPeriods: number;
    latestPeriodStatus: string | null;
    latestPeriodMonth: number | null;
    latestPeriodYear: number | null;
    metricsLoadedInLatestPeriod: number;
    attentionLevel: string | null;
    attentionScore: number | null;
  };
  latestMetrics: {
    ingresosFacturacion: number | null;
    consultasMensuales: number | null;
    cierresDelMes: number | null;
  };
  evolution: Array<{
    id: string;
    month: number;
    year: number;
    status: string;
    metricsCount: number;
    balanceGeneral: number | null;
    ingresosFacturacion: number | null;
    cantidadTotalTatuajes: number | null;
    comisionEstudio: number | null;
    comisionEstudioPorcentaje: number | null;
    gastosDelMes: number | null;
    seguidoresInstagramActuales: number | null;
    consultasMensuales: number | null;
    conversacionesANuevos: number | null;
    cotizaciones: number | null;
    cierresDelMes: number | null;
    cierresNuevosClientes: number | null;
    cierresPorRecomendaciones: number | null;
    cierresRecurrentes: number | null;
  }>;
  dashboardQuickLinks: Array<{ id: string; title: string; url: string }>;
  quickLinks: Array<{ id: string; title: string; url: string }>;
  goals: Array<{ id: string; status: string; goal: { title: string } }>;
  challenges: Array<{
    id: string;
    status: string;
    dueDate: string | null;
    challenge: {
      title: string;
      description: string | null;
      iconKey: string | null;
      rewardTitle: string | null;
      rewardUrl: string | null;
    };
  }>;
  rewards: Array<{ id: string; status: string; reward: { title: string } }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    startsAt: string;
    endsAt: string | null;
    externalSource: string | null;
  }>;
};

type StudentOwnProfile = {
  id: string;
  nationality: string | null;
  country: string | null;
  instagramHandle: string | null;
  birthDate: string | null;
  timezone: string | null;
  displayCurrencyMode: 'LOCAL' | 'USD' | 'BOTH';
  localCurrency: {
    id: string;
    code: string;
    symbol: string | null;
  } | null;
  user: {
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    lastLoginAt: string | null;
    createdAt: string;
  };
};

type Currency = {
  id: string;
  code: string;
  symbol: string | null;
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

type QuickLink = {
  id: string;
  title: string;
  url: string;
};

function resolveTab(tab?: string): TabKey {
  if (tab === 'results' || tab === 'challenges' || tab === 'profile') {
    return tab;
  }

  return 'dashboard';
}

function formatCurrencyAmount(value: number, currencyCode: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function StudentPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const session = await requireRole('STUDENT');
  const params = searchParams ? await searchParams : undefined;
  const activeTab = resolveTab(params?.tab);
  const [data, metricDefinitions, ownProfile, quickLinks, currencies, notifications] = await Promise.all([
    activeTab === 'dashboard' || activeTab === 'results' || activeTab === 'challenges'
      ? backendFetch<StudentDashboard>('/dashboard/student', {
          token: session.token,
        })
      : Promise.resolve(null),
    activeTab === 'results'
      ? backendFetch<MetricDefinition[]>('/metrics/definitions?includeInactive=false', {
          token: session.token,
        })
      : Promise.resolve([]),
    activeTab === 'profile'
      ? backendFetch<StudentOwnProfile>('/students/me', {
          token: session.token,
        })
      : Promise.resolve(null),
    activeTab === 'profile'
      ? backendFetch<QuickLink[]>('/student-links/me', {
          token: session.token,
        })
      : Promise.resolve([]),
    activeTab === 'profile'
      ? backendFetch<Currency[]>('/currency/currencies', {
          token: session.token,
        })
      : Promise.resolve([]),
    safeBackendFetch<NotificationItem[]>(
      '/notifications',
      [],
      {
        token: session.token,
      },
      'student notifications',
    ),
  ]);

  const latestIncome = data?.latestMetrics.ingresosFacturacion ?? 0;
  const estimatedCosts = Math.max(0, latestIncome - Math.round(latestIncome * 0.6));
  const estimatedMargin =
    latestIncome > 0 ? Math.round(((latestIncome - estimatedCosts) / latestIncome) * 100) : 0;
  const localCurrencyCode = data?.student.localCurrency?.code ?? 'USD';
  const facturacionAmount = formatCurrencyAmount(latestIncome, localCurrencyCode);
  const localIncomeAmount = formatCurrencyAmount(latestIncome, localCurrencyCode);
  const localCostsAmount = formatCurrencyAmount(estimatedCosts, localCurrencyCode);

  return (
    <AppShell
      title=""
      subtitle=""
      role={session.role}
      displayName={session.displayName}
      activeNav={activeTab}
      showSectionEyebrow={false}
      notifications={notifications}
    >
      {activeTab !== 'challenges' && activeTab !== 'profile' ? (
        <section className="dashboard-headline">
          <div>
            <h3 className="dashboard-headline-title">
              {activeTab === 'results' ? (
                <>
                  Resultados, <span>en detalle</span>
                </>
              ) : (
                <>
                  Hola, <span>{session.displayName}</span>
                </>
              )}
            </h3>
            <p className="dashboard-headline-copy">
              {activeTab === 'results'
                ? 'Profundiza en la evolucion mensual de tus ingresos, consultas y cierres.'
                : 'Tu resumen de resultados'}
            </p>
          </div>
          <Link
            className="primary-button dashboard-cta"
            href={activeTab === 'dashboard' ? '/student?tab=results' : '/student?tab=dashboard'}
            prefetch
            scroll={false}
          >
            {activeTab === 'dashboard' ? 'Ver resultados' : 'Volver al dashboard'}
          </Link>
        </section>
      ) : null}

      {activeTab === 'dashboard' && data ? (
        <>
          <section className="summary-grid summary-grid-student">
            <article className="summary-card metric-card">
              <div className="metric-card-top">
                <span>{data?.metricLabels.revenue ?? 'Ingresos'}</span>
                <span className="metric-card-icon">$</span>
              </div>
              <strong>{facturacionAmount}</strong>
              <p>Ultimo periodo registrado ({localCurrencyCode})</p>
            </article>
            <article className="summary-card metric-card">
              <div className="metric-card-top">
                <span>Ingresos</span>
                <span className="metric-card-icon">+</span>
              </div>
              <strong>{localIncomeAmount}</strong>
              <p>Moneda local ({localCurrencyCode})</p>
            </article>
            <article className="summary-card metric-card">
              <div className="metric-card-top">
                <span>Gastos estimados</span>
                <span className="metric-card-icon">[]</span>
              </div>
              <strong>{localCostsAmount}</strong>
              <p>Referencia operativa ({localCurrencyCode})</p>
            </article>
            <article className="summary-card metric-card">
              <div className="metric-card-top">
                <span>Margen estimado</span>
                <span className="metric-card-icon">%</span>
              </div>
              <strong>{estimatedMargin}%</strong>
              <p>Ingreso neto sobre facturacion</p>
            </article>
          </section>

          <section className="section-heading">
            <h3>Accesos rapidos</h3>
          </section>

          <section className="quick-access-grid">
            {data.dashboardQuickLinks.length > 0 ? (
              data.dashboardQuickLinks.slice(0, 4).map((link) => (
                <a
                  className="quick-access-card"
                  href={link.url}
                  key={link.id}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="quick-access-icon">+</span>
                  <strong>{link.title}</strong>
                </a>
              ))
            ) : (
              <article className="list-card student-calendar-card student-calendar-empty-card">
                <p>No hay accesos rapidos configurados por el administrador.</p>
              </article>
            )}
          </section>

          <section className="student-calendar-shell">
            <header className="student-calendar-header">
              <div>
                <h3>Google Calendar</h3>
                <p>Proximas reuniones, seguimientos y revisiones ya agendadas.</p>
              </div>
              <div className="student-calendar-badge">
                <span>Atencion</span>
                <strong className={getStatusClass(data.summary.attentionLevel)}>
                  {data.summary.attentionLevel ?? 'GREEN'}
                </strong>
              </div>
            </header>

            {data.upcomingEvents.length === 0 ? (
              <article className="list-card student-calendar-card">
                <p>Sin reuniones proximas cargadas.</p>
              </article>
            ) : (
              <StudentWeekCalendar events={data.upcomingEvents} />
            )}
          </section>
        </>
      ) : null}

      {activeTab === 'results' && data ? (
        <StudentResultsPanel
          evolution={data.evolution}
          metricDefinitions={metricDefinitions}
          localCurrency={data.student.localCurrency}
          metricLabels={data.metricLabels}
        />
      ) : null}

      {activeTab === 'challenges' && data ? (
        <StudentChallengesPanel challenges={data.challenges} />
      ) : null}

      {activeTab === 'profile' ? (
        ownProfile ? (
          <StudentProfilePanel
            profile={ownProfile}
            initialLinks={quickLinks}
            currencies={currencies}
          />
        ) : null
      ) : null}
    </AppShell>
  );
}
