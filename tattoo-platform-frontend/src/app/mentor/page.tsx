import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import {
  formatAttentionLevelLabel,
  formatCompactNumber,
  getStatusClass,
} from '@/components/dashboard-utils';
import { backendFetch } from '@/lib/backend';
import { safeBackendFetch } from '@/lib/server-fetch';
import { requireRole } from '@/lib/session';

type TabKey = 'dashboard' | 'results' | 'challenges' | 'profile';

type MentorDashboard = {
  metricLabels: {
    revenue: string;
    leads: string;
    closures: string;
  };
  students: Array<{
    studentId: string;
    name: string;
    email: string;
    country: string | null;
    latestPeriodStatus: string | null;
    latestPeriodMonth: number | null;
    latestPeriodYear: number | null;
    consultasMensuales: number | null;
    cierresDelMes: number | null;
    ingresosFacturacion: number | null;
    attentionLevel: string | null;
    attentionScore: number | null;
    riskSummary: {
      headline: string;
      items: string[];
    };
    recentPeriods: Array<{
      id: string;
      month: number;
      year: number;
      status: string;
      metricsCount: number;
      ingresosFacturacion: number | null;
      consultasMensuales: number | null;
      cierresDelMes: number | null;
      values: Array<{
        id: string;
        metricName: string;
        metricSlug: string;
        value: string | number | boolean | null;
      }>;
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

function resolveTab(tab?: string): TabKey {
  if (tab === 'results' || tab === 'challenges' || tab === 'profile') {
    return tab;
  }

  return 'dashboard';
}

function getMonthLabel(month: number, year: number) {
  return new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
}

function formatMetricValue(value: string | number | boolean | null) {
  if (value === null || value === undefined) {
    return '-';
  }

  if (typeof value === 'boolean') {
    return value ? 'Si' : 'No';
  }

  if (typeof value === 'number') {
    return new Intl.NumberFormat('es-AR', {
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(value);
  }

  return String(value);
}

export default async function MentorPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const session = await requireRole('MENTOR');
  const params = searchParams ? await searchParams : undefined;
  const activeTab = resolveTab(params?.tab);
  const [data, notifications] = await Promise.all([
    backendFetch<MentorDashboard>('/dashboard/mentor', {
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
      title={activeTab === 'dashboard' ? '' : 'Panel de Mentores'}
      subtitle={activeTab === 'dashboard' ? '' : 'Control global de tus alumnos'}
      role={session.role}
      displayName={session.displayName}
      activeNav={activeTab}
      showSectionEyebrow={false}
      notifications={notifications}
    >
      {activeTab !== 'dashboard' ? (
        <section className="dashboard-headline mentor-secondary-headline">
          <div>
            <h3 className="dashboard-headline-title">
              {activeTab === 'results' ? (
                <>
                  Gestion de <span>alumnos</span>
                </>
              ) : activeTab === 'challenges' ? (
                <>
                  Muro de <span>alertas</span>
                </>
              ) : (
                <>
                  Base de <span>seguimiento</span>
                </>
              )}
            </h3>
            <p className="dashboard-headline-copy">
              {activeTab === 'results'
                ? 'Vista de alumnos con resultados, estado de carga y senales de seguimiento.'
                : activeTab === 'challenges'
                  ? 'Prioriza los casos con riesgo, alumnos sin registros y seguimientos pendientes.'
                  : 'Listado completo de tus alumnos asignados para seguimiento diario.'}
            </p>
          </div>
        </section>
      ) : null}

      {activeTab === 'dashboard' ? null : null}

      {activeTab === 'results' ? (
        <section className="results-grid">
          {data.students.map((student) => (
            <article className="panel-card result-detail-card" key={student.studentId}>
              <div className="result-card-header">
                <div>
                  <p className="eyebrow">Alumno</p>
                  <h3>{student.name}</h3>
                  <p className="muted">{student.email}</p>
                  {student.country ? <p className="muted">{student.country}</p> : null}
                  <Link className="ghost-button student-management-profile-link" href={`/admin/students/${student.studentId}`}>
                    Ver perfil completo
                  </Link>
                </div>
                <span className={getStatusClass(student.attentionLevel)}>
                  {formatAttentionLevelLabel(student.attentionLevel)}
                </span>
              </div>
              <div className="result-points">
                <div>
                  <span className="list-row-label">{data.metricLabels.revenue}</span>
                  <strong>{formatCompactNumber(student.ingresosFacturacion)}</strong>
                </div>
                <div>
                  <span className="list-row-label">{data.metricLabels.leads}</span>
                  <strong>{formatCompactNumber(student.consultasMensuales)}</strong>
                </div>
                <div>
                  <span className="list-row-label">{data.metricLabels.closures}</span>
                  <strong>{formatCompactNumber(student.cierresDelMes)}</strong>
                </div>
                <div>
                  <span className="list-row-label">Score</span>
                  <strong>{student.attentionScore ?? 0}</strong>
                </div>
              </div>
              <div className="mentor-risk-summary">
                <div className="mentor-risk-summary-header">
                  <strong>{student.riskSummary.headline}</strong>
                  <span className="muted">
                    {student.latestPeriodMonth && student.latestPeriodYear
                      ? getMonthLabel(student.latestPeriodMonth, student.latestPeriodYear)
                      : 'Sin periodo'}
                  </span>
                </div>
                <ul className="mentor-risk-summary-list">
                  {student.riskSummary.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="mentor-month-grid">
                {student.recentPeriods.map((period) => (
                  <details className="mentor-period-card" key={period.id}>
                    <summary className="mentor-period-summary">
                      <div>
                        <strong>{getMonthLabel(period.month, period.year)}</strong>
                        <span>{period.status}</span>
                      </div>
                      <div className="mentor-period-summary-metrics">
                        <span>${formatCompactNumber(period.ingresosFacturacion)}</span>
                        <span>{formatCompactNumber(period.consultasMensuales)} consultas</span>
                        <span>{formatCompactNumber(period.cierresDelMes)} cierres</span>
                      </div>
                    </summary>
                    <div className="mentor-period-detail">
                      <div className="mentor-period-detail-top">
                        <span>{period.metricsCount} metricas cargadas</span>
                        <span>{period.status}</span>
                      </div>
                      <div className="mentor-period-metrics-list">
                        {period.values.map((value) => (
                          <div className="mentor-period-metric-row" key={value.id}>
                            <span>{value.metricName}</span>
                            <strong>{formatMetricValue(value.value)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {activeTab === 'challenges' ? (
        <article className="list-card">
          <p className="eyebrow">Alertas</p>
          {data.students.map((student) => (
            <div className="list-row" key={student.studentId}>
              <div>
                <span className="list-row-label">Alumno</span>
                <strong>{student.name}</strong>
                <p>{student.email}</p>
              </div>
              <div>
                <span className="list-row-label">Estado</span>
                <strong>{student.latestPeriodStatus ?? 'Sin periodo'}</strong>
              </div>
              <div>
                <span className="list-row-label">Atencion</span>
                <span className={getStatusClass(student.attentionLevel)}>
                  {formatAttentionLevelLabel(student.attentionLevel)}
                </span>
              </div>
              <div>
                <span className="list-row-label">Score</span>
                <strong>{student.attentionScore ?? 0}</strong>
              </div>
            </div>
          ))}
        </article>
      ) : null}

      {activeTab === 'profile' ? (
        <section className="mentor-student-profile-grid">
          {data.students.map((student) => (
            <article className="list-card mentor-student-profile-card" key={student.studentId}>
              <div className="mentor-student-profile-head">
                <div>
                  <p className="eyebrow">Perfil del alumno</p>
                  <h3>{student.name}</h3>
                  <p className="muted">{student.email}</p>
                  <Link className="ghost-button student-management-profile-link" href={`/admin/students/${student.studentId}`}>
                    Ver perfil completo
                  </Link>
                </div>
                <div className="stacked-status">
                  <span className={getStatusClass(student.attentionLevel)}>
                    {formatAttentionLevelLabel(student.attentionLevel)}
                  </span>
                  <strong>{student.attentionScore ?? 0} pts</strong>
                </div>
              </div>
              <div className="mentor-student-profile-meta">
                <div>
                  <span className="list-row-label">Pais</span>
                  <strong>{student.country ?? 'Sin dato'}</strong>
                </div>
                <div>
                  <span className="list-row-label">Ultimo periodo</span>
                  <strong>
                    {student.latestPeriodMonth && student.latestPeriodYear
                      ? getMonthLabel(student.latestPeriodMonth, student.latestPeriodYear)
                      : 'Sin periodo'}
                  </strong>
                </div>
                <div>
                  <span className="list-row-label">Estado mensual</span>
                  <strong>{student.latestPeriodStatus ?? 'Sin periodo'}</strong>
                </div>
              </div>
              <div className="mentor-risk-summary mentor-risk-summary-profile">
                <div className="mentor-risk-summary-header">
                  <strong>{student.riskSummary.headline}</strong>
                  <span>{student.riskSummary.items.length} focos detectados</span>
                </div>
                <ul className="mentor-risk-summary-list">
                  {student.riskSummary.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="mentor-profile-periods">
                {student.recentPeriods.map((period) => (
                  <details className="mentor-period-card mentor-period-card-profile" key={period.id}>
                    <summary className="mentor-period-summary">
                      <div>
                        <strong>{getMonthLabel(period.month, period.year)}</strong>
                        <span>{period.status}</span>
                      </div>
                      <div className="mentor-period-summary-metrics">
                        <span>${formatCompactNumber(period.ingresosFacturacion)}</span>
                        <span>{formatCompactNumber(period.consultasMensuales)} consultas</span>
                        <span>{formatCompactNumber(period.cierresDelMes)} cierres</span>
                      </div>
                    </summary>
                    <div className="mentor-period-detail">
                      <div className="mentor-period-metrics-list">
                        {period.values.map((value) => (
                          <div className="mentor-period-metric-row" key={value.id}>
                            <span>{value.metricName}</span>
                            <strong>{formatMetricValue(value.value)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </AppShell>
  );
}
