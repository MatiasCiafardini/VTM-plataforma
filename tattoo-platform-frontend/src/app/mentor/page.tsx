import { AppShell } from '@/components/app-shell';
import {
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
    latestPeriodStatus: string | null;
    consultasMensuales: number | null;
    cierresDelMes: number | null;
    ingresosFacturacion: number | null;
    attentionLevel: string | null;
    attentionScore: number | null;
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
                </div>
                <span className={getStatusClass(student.attentionLevel)}>
                  {student.attentionLevel ?? 'GREEN'}
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
                  {student.attentionLevel ?? 'GREEN'}
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
        <article className="list-card">
          <p className="eyebrow">Seguimiento</p>
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
                <span className="list-row-label">
                  {data.metricLabels.leads} / {data.metricLabels.closures}
                </span>
                <strong>
                  {formatCompactNumber(student.consultasMensuales)} /{' '}
                  {formatCompactNumber(student.cierresDelMes)}
                </strong>
              </div>
              <div>
                <span className="list-row-label">Atencion</span>
                <div className="stacked-status">
                  <span className={getStatusClass(student.attentionLevel)}>
                    {student.attentionLevel ?? 'GREEN'}
                  </span>
                  <strong>{student.attentionScore ?? 0} pts</strong>
                </div>
              </div>
            </div>
          ))}
        </article>
      ) : null}
    </AppShell>
  );
}
