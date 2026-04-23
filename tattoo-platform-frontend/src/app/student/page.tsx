import { AppShell } from '@/components/app-shell';
import {
  getStatusClass,
} from '@/components/dashboard-utils';
import { StudentResultsPanel } from '@/components/student-results-panel';
import { StudentChallengesPanel } from '@/components/student-challenges-panel';
import { StudentProfilePanel } from '@/components/student-profile-panel';
import {
  EMBEDDED_TOOLS,
  EXTERNAL_TOOLS,
  EmbeddedToolEmbed,
  EmbeddedToolPromo,
  ExternalToolPromo,
} from '@/components/embedded-tool';
import { backendFetch } from '@/lib/backend';
import { safeBackendFetch } from '@/lib/server-fetch';
import { requireRole } from '@/lib/session';
import Link from 'next/link';

type TabKey = 'dashboard' | 'results' | 'challenges' | 'analyzer' | 'followups' | 'profile';

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
    timezone: string | null;
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
    balanceGeneral: number | null;
    balanceGeneralUsd: number | null;
    ingresosFacturacion: number | null;
    ingresosFacturacionUsd: number | null;
    comisionEstudio: number | null;
    comisionEstudioUsd: number | null;
    gastosDelMes: number | null;
    gastosDelMesUsd: number | null;
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
    balanceGeneralUsd: number | null;
    ingresosFacturacion: number | null;
    ingresosFacturacionUsd: number | null;
    cantidadTotalTatuajes: number | null;
    comisionEstudio: number | null;
    comisionEstudioUsd: number | null;
    comisionEstudioPorcentaje: number | null;
    gastosDelMes: number | null;
    gastosDelMesUsd: number | null;
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
    description: string | null;
    timezone: string;
    startsAt: string;
    endsAt: string | null;
    linkUrl: string | null;
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

type NewsItem = {
  id: string;
  title: string;
  body: string;
  isPublished: boolean;
  createdAt: string;
};

function resolveTab(tab?: string): TabKey {
  if (
    tab === 'results' ||
    tab === 'challenges' ||
    tab === 'analyzer' ||
    tab === 'followups' ||
    tab === 'profile'
  ) {
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

function formatMoneyWithUsd(localValue: number, currencyCode: string, usdValue?: number | null) {
  const local = formatCurrencyAmount(localValue, currencyCode);
  if (usdValue === null || usdValue === undefined) {
    return local;
  }

  const usd = formatCurrencyAmount(usdValue, 'USD');
  return `${local} (${usd})`;
}

function formatMeetingDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(value));
}

function formatMeetingTimeRange(
  startsAt: string,
  endsAt: string | null,
  timezone: string,
) {
  const formatter = new Intl.DateTimeFormat('es-AR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const startLabel = formatter.format(new Date(startsAt));
  if (!endsAt) {
    return startLabel;
  }

  return `${startLabel} a ${formatter.format(new Date(endsAt))}`;
}

export default async function StudentPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const session = await requireRole('STUDENT');
  const params = searchParams ? await searchParams : undefined;
  const activeTab = resolveTab(params?.tab);
  const [data, metricDefinitions, ownProfile, quickLinks, currencies, notifications, publishedNews] = await Promise.all([
    activeTab === 'dashboard' || activeTab === 'results' || activeTab === 'challenges' || activeTab === 'profile'
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
    activeTab === 'dashboard'
      ? safeBackendFetch<NewsItem[]>(
          '/news/published',
          [],
          { token: session.token },
          'student news',
        )
      : Promise.resolve([]),
  ]);

  const latestRevenue = data?.latestMetrics.ingresosFacturacion ?? 0;
  const latestRevenueUsd = data?.latestMetrics.ingresosFacturacionUsd ?? null;
  const latestOwnIncome = data?.latestMetrics.balanceGeneral ?? 0;
  const latestOwnIncomeUsd = data?.latestMetrics.balanceGeneralUsd ?? null;
  const latestCosts = data?.latestMetrics.gastosDelMes ?? 0;
  const latestCostsUsd = data?.latestMetrics.gastosDelMesUsd ?? null;
  const estimatedMargin =
    latestRevenue > 0 ? Math.round((latestOwnIncome / latestRevenue) * 100) : 0;
  const localCurrencyCode = data?.student.localCurrency?.code ?? 'USD';
  const facturacionAmount = formatMoneyWithUsd(latestRevenue, localCurrencyCode, latestRevenueUsd);
  const localIncomeAmount = formatMoneyWithUsd(
    latestOwnIncome,
    localCurrencyCode,
    latestOwnIncomeUsd,
  );
  const localCostsAmount = formatMoneyWithUsd(
    latestCosts,
    localCurrencyCode,
    latestCostsUsd,
  );

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
      {activeTab !== 'challenges' &&
      activeTab !== 'profile' &&
      activeTab !== 'analyzer' &&
      activeTab !== 'followups' ? (
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
                <span>Ingresos totales</span>
                <span className="metric-card-icon">$</span>
              </div>
              <strong>{facturacionAmount}</strong>
              <p>Ultimo periodo registrado ({localCurrencyCode})</p>
            </article>
            <article className="summary-card metric-card">
              <div className="metric-card-top">
                <span>Ingresos propios</span>
                <span className="metric-card-icon">+</span>
              </div>
              <strong>{localIncomeAmount}</strong>
              <p>Luego de comision y gastos ({localCurrencyCode})</p>
            </article>
            <article className="summary-card metric-card">
              <div className="metric-card-top">
                <span>Gastos</span>
                <span className="metric-card-icon">[]</span>
              </div>
              <strong>{localCostsAmount}</strong>
              <p>Suma total cargada ({localCurrencyCode})</p>
            </article>
            <article className="summary-card metric-card">
              <div className="metric-card-top">
                <span>Margen estimado</span>
                <span className="metric-card-icon">%</span>
              </div>
              <strong>{estimatedMargin}%</strong>
              <p>Ingreso neto sobre ingresos totales</p>
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

          <section className="section-heading">
            <h3>Herramientas</h3>
          </section>

          <section className="tools-grid">
            <EmbeddedToolPromo href="/student?tab=analyzer" tool={EMBEDDED_TOOLS.analyzer} />
            <EmbeddedToolPromo href="/student?tab=followups" tool={EMBEDDED_TOOLS.followups} />
          </section>

          <section className="tools-grid">
            <ExternalToolPromo tool={EXTERNAL_TOOLS['mentoring-videos']} />
            <ExternalToolPromo tool={EXTERNAL_TOOLS['sales-simulator']} />
          </section>

          {publishedNews.length > 0 ? (
            <section className="student-calendar-shell">
              <header className="student-calendar-header">
                <div>
                  <h3>Novedades</h3>
                  <p>Ultimas noticias y anuncios del equipo VMT.</p>
                </div>
              </header>

              <div className="student-group-meeting-list">
                {publishedNews.map((item) => (
                  <article key={item.id} className="student-calendar-card student-group-meeting-card">
                    <div className="student-group-meeting-head">
                      <div>
                        <strong>{item.title}</strong>
                        <p>
                          {new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(
                            new Date(item.createdAt),
                          )}
                        </p>
                      </div>
                    </div>
                    <p className="student-group-meeting-description">
                      {item.body}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="student-calendar-shell">
            <header className="student-calendar-header">
              <div>
                <h3>Proximas reuniones grupales</h3>
                <p>Horarios convertidos automaticamente a tu zona local.</p>
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
              <div className="student-group-meeting-list">
                {data.upcomingEvents.map((meeting) => {
                  const studentTimezone = data.student.timezone ?? meeting.timezone ?? 'UTC';
                  const content = (
                    <>
                      <div className="student-group-meeting-head">
                        <div>
                          <strong>{meeting.title}</strong>
                          <p>{formatMeetingDate(meeting.startsAt, studentTimezone)}</p>
                        </div>
                        <span className="status-chip status-neutral">
                          {formatMeetingTimeRange(
                            meeting.startsAt,
                            meeting.endsAt,
                            studentTimezone,
                          )}
                        </span>
                      </div>
                      {meeting.description ? (
                        <p className="student-group-meeting-description">{meeting.description}</p>
                      ) : null}
                      <p className="student-group-meeting-meta">
                        Se muestra en tu zona horaria: {studentTimezone}
                      </p>
                    </>
                  );

                  return meeting.linkUrl ? (
                    <a
                      key={meeting.id}
                      href={meeting.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="student-calendar-card student-group-meeting-card student-group-meeting-link"
                    >
                      {content}
                    </a>
                  ) : (
                    <article
                      key={meeting.id}
                      className="student-calendar-card student-group-meeting-card"
                    >
                      {content}
                    </article>
                  );
                })}
              </div>
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

      {activeTab === 'analyzer' ? (
        <EmbeddedToolEmbed
          dashboardHref="/student?tab=dashboard"
          dashboardLabel="Volver al dashboard"
          tool={EMBEDDED_TOOLS.analyzer}
        />
      ) : null}

      {activeTab === 'followups' ? (
        <EmbeddedToolEmbed
          dashboardHref="/student?tab=dashboard"
          dashboardLabel="Volver al dashboard"
          tool={EMBEDDED_TOOLS.followups}
        />
      ) : null}

      {activeTab === 'profile' ? (
        ownProfile ? (
          <StudentProfilePanel
            profile={ownProfile}
            initialLinks={quickLinks}
            currencies={currencies}
            challengeRewards={
              data?.challenges
                .filter(
                  (challenge) =>
                    challenge.status === 'COMPLETED' &&
                    Boolean(challenge.challenge.rewardTitle),
                )
                .map((challenge) => ({
                  id: challenge.id,
                  challengeTitle: challenge.challenge.title,
                  rewardTitle: challenge.challenge.rewardTitle ?? '',
                  rewardUrl: challenge.challenge.rewardUrl,
                })) ?? []
            }
          />
        ) : null
      ) : null}
    </AppShell>
  );
}
