import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { ChallengeIcon } from '@/components/challenge-icons';
import { safeBackendFetch } from '@/lib/server-fetch';
import { requireAnyRole } from '@/lib/session';

// ─── Types ───────────────────────────────────────────────────────────────────

type StudentProfile = {
  id: string;
  userId: string;
  country: string | null;
  timezone: string | null;
  displayCurrencyMode: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    lastLoginAt: string | null;
    createdAt: string;
  };
  localCurrency: { id: string; code: string; symbol: string | null } | null;
  mentorAssignments: Array<{
    mentor: {
      user: {
        firstName: string;
        lastName: string;
        email: string;
      };
    };
  }>;
};

type StudentChallenge = {
  id: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  assignedAt: string;
  dueDate: string | null;
  challenge: {
    id: string;
    title: string;
    description: string | null;
    iconKey: string;
    rewardTitle: string | null;
    difficultyStars: number;
    targetValue: number | null;
    metricDefinition: {
      name: string;
      slug: string;
      valueType: string;
    } | null;
    prerequisiteChallenge: {
      id: string;
      title: string;
      difficultyStars: number;
    } | null;
  };
};

type MetricPeriod = {
  id: string;
  month: number;
  year: number;
  status: string;
  submittedAt: string | null;
  closedAt: string | null;
  updatedAt: string;
  values: Array<{
    id: string;
    numberValue: string | number | null;
    textValue: string | null;
    booleanValue: boolean | null;
    originalAmount: string | number | null;
    usdAmount: string | number | null;
    originalCurrency: { code: string; symbol: string | null } | null;
    metricDefinition: {
      name: string;
      slug: string;
      valueType: 'INTEGER' | 'DECIMAL' | 'CURRENCY' | 'TEXT' | 'BOOLEAN';
      isRequired: boolean;
      category: {
        name: string;
        slug: string;
      };
    };
  }>;
};

type MetricDefinition = {
  id: string;
  name: string;
  slug: string;
  valueType: 'INTEGER' | 'DECIMAL' | 'CURRENCY' | 'TEXT' | 'BOOLEAN';
  isRequired: boolean;
  isActive: boolean;
  category: {
    name: string;
    slug: string;
  };
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

type AttentionScore = {
  studentId: string;
  score: number;
  level: 'GREEN' | 'YELLOW' | 'RED';
  reasonNoMetrics: boolean;
  reasonIncomeDrop: boolean;
  reasonLeadsDrop: boolean;
  reasonClosuresDrop: boolean;
  reasonGoalsMissed: boolean;
  reasonInactivity: boolean;
};

type StudentOnboardingRoadmap = {
  summary: {
    completedSteps: number;
    pendingSteps: number;
    progressPercentage: number;
    currentPhaseTitle: string | null;
    nextStep: {
      id: string;
      title: string;
      phaseTitle: string;
    } | null;
    lastProgressAt: string | null;
    isCompleted: boolean;
  };
  phases: Array<{
    id: string;
    title: string;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    completedSteps: number;
    pendingSteps: number;
    progressPercentage: number;
  }>;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(iso));
}

function getMonthLabel(month: number, year: number) {
  return new Intl.DateTimeFormat('es-AR', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyWithCode(value: number, currencyCode: string) {
  return new Intl.NumberFormat(currencyCode === 'USD' ? 'en-US' : 'es-AR', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function renderStars(stars: number) {
  return '★'.repeat(stars) + '☆'.repeat(Math.max(0, 5 - stars));
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getMetricNumber(value: MetricPeriod['values'][number] | null) {
  if (!value) return null;
  return toNumber(value.usdAmount ?? value.originalAmount ?? value.numberValue);
}

function hasMetricValue(value: MetricPeriod['values'][number]) {
  return (
    value.numberValue !== null ||
    value.textValue !== null ||
    value.booleanValue !== null ||
    value.originalAmount !== null ||
    value.usdAmount !== null
  );
}

function formatMetricValue(value: MetricPeriod['values'][number]) {
  if (value.metricDefinition.valueType === 'BOOLEAN') {
    return value.booleanValue ? 'Si' : 'No';
  }

  if (value.metricDefinition.valueType === 'TEXT') {
    return value.textValue?.trim() || 'Sin dato';
  }

  if (value.metricDefinition.valueType === 'CURRENCY') {
    const original = toNumber(value.originalAmount);
    const usd = toNumber(value.usdAmount);
    const currencyCode = value.originalCurrency?.code ?? 'USD';

    if (original === null && usd === null) {
      return 'Sin dato';
    }

    if (original !== null && currencyCode !== 'USD') {
      const local = formatCurrencyWithCode(original, currencyCode);
      return usd !== null ? `${local} / ${formatCurrencyWithCode(usd, 'USD')}` : local;
    }

    return formatCurrencyWithCode(usd ?? original ?? 0, 'USD');
  }

  const numeric = toNumber(value.numberValue);
  return numeric === null ? 'Sin dato' : formatNumber(numeric);
}

function groupValuesByCategory(values: MetricPeriod['values']) {
  const groups = new Map<string, { name: string; values: MetricPeriod['values'] }>();

  for (const value of values) {
    const category = value.metricDefinition.category;
    const key = category?.slug ?? 'sin-categoria';
    const existing = groups.get(key);

    if (existing) {
      existing.values.push(value);
    } else {
      groups.set(key, {
        name: category?.name ?? 'Sin categoria',
        values: [value],
      });
    }
  }

  return Array.from(groups.values());
}

function getMetricBySlug(period: MetricPeriod, slug: string) {
  return period.values.find((value) => value.metricDefinition.slug === slug) ?? null;
}

function buildPeriodReview(period: MetricPeriod, definitions: MetricDefinition[]) {
  const presentSlugs = new Set(
    period.values.filter(hasMetricValue).map((value) => value.metricDefinition.slug),
  );
  const missingRequired = definitions.filter(
    (definition) => definition.isActive && definition.isRequired && !presentSlugs.has(definition.slug),
  );
  const issues: string[] = [];

  if (missingRequired.length > 0) {
    issues.push(`Faltan metricas obligatorias: ${missingRequired.map((item) => item.name).join(', ')}.`);
  }

  const leads = getMetricNumber(getMetricBySlug(period, 'consultas-mensuales'));
  const quotes = getMetricNumber(getMetricBySlug(period, 'cotizaciones'));
  const closures = getMetricNumber(getMetricBySlug(period, 'cierres-del-mes'));
  const newClients = getMetricNumber(getMetricBySlug(period, 'cierres-nuevos-clientes')) ?? 0;
  const recommendations = getMetricNumber(getMetricBySlug(period, 'cierres-por-recomendaciones')) ?? 0;
  const recurring = getMetricNumber(getMetricBySlug(period, 'cierres-recurrentes')) ?? 0;
  const closureOrigins = newClients + recommendations + recurring;

  if (leads !== null && quotes !== null && quotes > leads) {
    issues.push('Hay mas cotizaciones que consultas mensuales.');
  }

  if (leads !== null && closures !== null && closures > leads) {
    issues.push('Hay mas cierres que consultas mensuales.');
  }

  if (closures !== null && closureOrigins > 0 && closureOrigins !== closures) {
    issues.push(`Los origenes de cierres suman ${formatNumber(closureOrigins)} y el total declarado es ${formatNumber(closures)}.`);
  }

  return issues;
}

function getRevenueHistory(periods: MetricPeriod[]) {
  return periods
    .map((period) => {
      const revenueValue =
        period.values.find((v) => v.metricDefinition.slug === 'ingresos-facturacion') ??
        period.values.find((v) => v.metricDefinition.valueType === 'CURRENCY');
      const revenue = getMetricNumber(revenueValue ?? null);
      return {
        month: period.month,
        year: period.year,
        revenue,
        label: getMonthLabel(period.month, period.year),
      };
    })
    .filter((entry) => entry.revenue !== null);
}

function getGrowthStats(revenueHistory: ReturnType<typeof getRevenueHistory>) {
  if (revenueHistory.length < 2) return null;
  const first = revenueHistory[revenueHistory.length - 1]!.revenue!;
  const latest = revenueHistory[0]!.revenue!;
  if (!first) return null;
  const pct = Math.round(((latest - first) / first) * 100);
  return { first, latest, pct };
}

function getRiskInfo(score: AttentionScore | null) {
  if (!score) {
    return {
      label: 'Sin registros',
      className: 'student-profile-risk-none',
      summary: ['Todavia no hay un analisis de riesgo calculado para este alumno.'],
    };
  }

  const summary: string[] = [];

  if (score.reasonNoMetrics) summary.push('No cargo metricas en el ultimo periodo.');
  if (score.reasonIncomeDrop) summary.push('Los ingresos bajaron frente al periodo anterior.');
  if (score.reasonLeadsDrop) summary.push('Las consultas bajaron frente al periodo anterior.');
  if (score.reasonClosuresDrop) summary.push('Los cierres bajaron frente al periodo anterior.');
  if (score.reasonGoalsMissed) summary.push('Tiene objetivos vencidos o incumplidos.');
  if (score.reasonInactivity) summary.push('Se detecta inactividad o un borrador sin movimiento.');

  if (score.level === 'RED') {
    return {
      label: 'En riesgo',
      className: 'student-profile-risk-danger',
      summary: summary.length > 0 ? summary : ['El alumno necesita accion inmediata.'],
    };
  }

  if (score.level === 'YELLOW') {
    return {
      label: 'En seguimiento',
      className: 'student-profile-risk-active',
      summary: summary.length > 0 ? summary : ['Hay senales para revisar de cerca.'],
    };
  }

  return {
    label: 'Estable',
    className: 'student-profile-risk-success',
    summary: summary.length > 0 ? summary : ['No hay alertas activas en este momento.'],
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const session = await requireAnyRole(['ADMIN', 'MENTOR']);
  const { studentId } = await params;
  const attentionScoresPath =
    session.role === 'MENTOR' ? '/attention-scores/mentor' : '/attention-scores/admin';

  const [profile, challenges, periods, metricDefinitions, notifications, attentionScores, onboarding] = await Promise.all([
    safeBackendFetch<StudentProfile | null>(
      `/students/${studentId}`,
      null,
      { token: session.token },
      'student profile',
    ),
    safeBackendFetch<StudentChallenge[]>(
      `/challenges/student/${studentId}`,
      [],
      { token: session.token },
      'student challenges',
    ),
    safeBackendFetch<MetricPeriod[]>(
      `/metrics/periods/student/${studentId}`,
      [],
      { token: session.token },
      'student periods',
    ),
    safeBackendFetch<MetricDefinition[]>(
      '/metrics/definitions?includeInactive=false',
      [],
      { token: session.token },
      'metric definitions',
    ),
    safeBackendFetch<NotificationItem[]>(
      '/notifications',
      [],
      { token: session.token },
      'admin notifications',
    ),
    safeBackendFetch<AttentionScore[]>(
      attentionScoresPath,
      [],
      { token: session.token },
      'attention scores',
    ),
    safeBackendFetch<StudentOnboardingRoadmap | null>(
      `/onboarding/student/${studentId}`,
      null,
      { token: session.token },
      'student onboarding',
    ),
  ]);

  if (!profile) {
    notFound();
  }

  const revenueHistory = getRevenueHistory(periods);
  const growthStats = getGrowthStats(revenueHistory);
  const completedChallenges = challenges.filter((c) => c.status === 'COMPLETED');
  const activeChallenges = challenges.filter(
    (c) => c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS',
  );
  const riskScore = attentionScores.find((item) => item.studentId === studentId) ?? null;
  const riskInfo = getRiskInfo(riskScore);
  const mentors = profile.mentorAssignments.map((a) => a.mentor.user);
  const fullName = `${profile.user.firstName} ${profile.user.lastName}`;
  const completedPeriods = periods.filter(
    (period) => period.status === 'SUBMITTED' || period.status === 'CLOSED',
  );
  const backHref = session.role === 'MENTOR' ? '/mentor?tab=profile' : '/admin?tab=results';
  const backLabel =
    session.role === 'MENTOR' ? 'Volver a mis alumnos' : 'Volver a gestion de alumnos';

  return (
    <AppShell
      title=""
      subtitle=""
      role={session.role}
      displayName={session.displayName}
      activeNav={session.role === 'MENTOR' ? 'profile' : 'results'}
      showSectionEyebrow={false}
      notifications={notifications}
    >
      <div className="student-profile-page">

        {/* Back nav */}
        <Link href={backHref} className="student-profile-back-link" aria-label={backLabel}>
          &larr; {backLabel}
        </Link>

        {/* Hero */}
        <section className="student-profile-hero">
          <div className="student-profile-avatar">
            {getInitials(profile.user.firstName, profile.user.lastName)}
          </div>
          <div className="student-profile-hero-info">
            <div className="student-profile-hero-top">
              <h2 className="student-profile-name">{fullName}</h2>
              <span className={`student-profile-risk-badge ${riskInfo.className}`}>
                {riskInfo.label}
              </span>
            </div>
            <p className="student-profile-email">{profile.user.email}</p>
            <div className="student-profile-hero-meta">
              {profile.country ? <span>{profile.country}</span> : null}
              {profile.timezone ? <span>{profile.timezone}</span> : null}
              <span>Miembro desde {formatDate(profile.user.createdAt)}</span>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="student-profile-stats">
          <article className="student-profile-stat-card student-profile-stat-risk">
            <span>Estado de riesgo</span>
            <strong>{riskInfo.label}</strong>
            <small>{riskScore ? `${riskScore.score} puntos` : 'Sin score'}</small>
          </article>
          {growthStats ? (
            <>
              <article className="student-profile-stat-card">
                <span>Primer mes</span>
                <strong>{formatCurrency(growthStats.first)}</strong>
              </article>
              <article className="student-profile-stat-card">
                <span>Ultimo mes registrado</span>
                <strong>{formatCurrency(growthStats.latest)}</strong>
              </article>
              <article className="student-profile-stat-card student-profile-stat-accent">
                <span>Crecimiento total</span>
                <strong>{growthStats.pct > 0 ? '+' : ''}{growthStats.pct}%</strong>
              </article>
            </>
          ) : (
            <article className="student-profile-stat-card">
              <span>Facturacion</span>
              <strong>Sin datos aun</strong>
            </article>
          )}
          <article className="student-profile-stat-card">
            <span>Logros completados</span>
            <strong>{completedChallenges.length}</strong>
          </article>
          <article className="student-profile-stat-card">
            <span>Desafios activos</span>
            <strong>{activeChallenges.length}</strong>
          </article>
        </section>

        <div className="student-profile-body">
          <section className="student-profile-section student-profile-risk-section">
            <h3 className="student-profile-section-title">Resumen de riesgo</h3>
            <div className="student-profile-risk-summary">
              <div className="student-profile-risk-summary-head">
                <strong>{riskInfo.label}</strong>
                <span>{riskScore ? `${riskScore.score} puntos de attention score` : 'Sin score'}</span>
              </div>
              <ul className="student-profile-risk-summary-list">
                {riskInfo.summary.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          {onboarding ? (
            <section className="student-profile-section">
              <h3 className="student-profile-section-title">Resumen de onboarding</h3>
              <div className="onboarding-board-topline">
                <div>
                  <span className="list-row-label">Progreso</span>
                  <strong>{onboarding.summary.progressPercentage}%</strong>
                </div>
                <div>
                  <span className="list-row-label">Fase actual</span>
                  <strong>{onboarding.summary.currentPhaseTitle ?? 'Finalizado'}</strong>
                </div>
                <div>
                  <span className="list-row-label">Siguiente paso</span>
                  <strong>{onboarding.summary.nextStep?.title ?? 'Sin pendientes'}</strong>
                </div>
              </div>

              <div className="onboarding-student-progress-track">
                <span style={{ width: `${onboarding.summary.progressPercentage}%` }} />
              </div>

              <div className="onboarding-board-phase-list">
                {onboarding.phases.map((phase) => (
                  <article className="onboarding-board-phase-card" key={phase.id}>
                    <div className="onboarding-board-phase-head">
                      <strong>{phase.title}</strong>
                      <span
                        className={
                          phase.status === 'COMPLETED'
                            ? 'status-chip status-green'
                            : phase.status === 'IN_PROGRESS'
                              ? 'status-chip status-yellow'
                              : 'status-chip status-neutral'
                        }
                      >
                        {phase.status === 'COMPLETED'
                          ? 'Completada'
                          : phase.status === 'IN_PROGRESS'
                            ? 'En progreso'
                            : 'No iniciada'}
                      </span>
                    </div>
                    <div className="onboarding-board-phase-track">
                      <span style={{ width: `${phase.progressPercentage}%` }} />
                    </div>
                    <p>
                      {phase.completedSteps} completados · {phase.pendingSteps} pendientes
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="student-profile-section">
            <h3 className="student-profile-section-title">
              Meses completos cargados
              <span className="student-profile-section-count">{completedPeriods.length}</span>
            </h3>
            {completedPeriods.length > 0 ? (
              <div className="student-profile-month-detail-list">
                {completedPeriods.map((period) => {
                  const issues = buildPeriodReview(period, metricDefinitions);
                  const groupedValues = groupValuesByCategory(period.values);

                  return (
                    <details className="student-profile-month-detail" key={period.id}>
                      <summary className="student-profile-month-summary">
                        <div>
                          <strong>{getMonthLabel(period.month, period.year)}</strong>
                          <span>{period.status === 'CLOSED' ? 'Cerrado' : 'Enviado'}</span>
                        </div>
                        <div className="student-profile-month-summary-meta">
                          <span>{period.values.filter(hasMetricValue).length} metricas</span>
                          <span className={issues.length > 0 ? 'student-profile-month-review-warn' : 'student-profile-month-review-ok'}>
                            {issues.length > 0 ? `${issues.length} observacion${issues.length === 1 ? '' : 'es'}` : 'Sin observaciones'}
                          </span>
                        </div>
                      </summary>

                      <div className="student-profile-month-content">
                        {issues.length > 0 ? (
                          <div className="student-profile-month-review">
                            <strong>Para revisar</strong>
                            <ul>
                              {issues.map((issue) => (
                                <li key={issue}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="student-profile-month-review student-profile-month-review-good">
                            <strong>Lectura rapida</strong>
                            <p>Las metricas obligatorias y las relaciones principales no muestran inconsistencias.</p>
                          </div>
                        )}

                        <div className="student-profile-month-category-list">
                          {groupedValues.map((group) => (
                            <section className="student-profile-month-category" key={group.name}>
                              <h4>{group.name}</h4>
                              <div className="student-profile-month-metric-grid">
                                {group.values.map((value) => (
                                  <div className="student-profile-month-metric" key={value.id}>
                                    <span>
                                      {value.metricDefinition.name}
                                      {value.metricDefinition.isRequired ? ' *' : ''}
                                    </span>
                                    <strong>{formatMetricValue(value)}</strong>
                                  </div>
                                ))}
                              </div>
                            </section>
                          ))}
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            ) : (
              <p className="student-profile-empty">Todavia no hay meses enviados o cerrados para desglozar.</p>
            )}
          </section>

          {/* Achievements */}
          <section className="student-profile-section">
            <h3 className="student-profile-section-title">
              Logros desbloqueados
              <span className="student-profile-section-count">{completedChallenges.length}</span>
            </h3>
            {completedChallenges.length > 0 ? (
              <div className="student-profile-achievements-grid">
                {completedChallenges.map((sc) => (
                  <article key={sc.id} className="student-profile-achievement-card">
                    <div className="student-profile-achievement-icon">
                      {ChallengeIcon({ iconKey: sc.challenge.iconKey })}
                    </div>
                    <div className="student-profile-achievement-info">
                      <strong>{sc.challenge.title}</strong>
                      {sc.challenge.description ? (
                        <p>{sc.challenge.description}</p>
                      ) : null}
                      <span className="student-profile-achievement-stars">
                        {renderStars(sc.challenge.difficultyStars)}
                      </span>
                      {sc.challenge.rewardTitle ? (
                        <span className="student-profile-achievement-reward">
                          Recompensa: {sc.challenge.rewardTitle}
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="student-profile-empty">Todavia no hay logros completados.</p>
            )}
          </section>

          {/* Active challenges */}
          {activeChallenges.length > 0 ? (
            <section className="student-profile-section">
              <h3 className="student-profile-section-title">
                Desafios en curso
                <span className="student-profile-section-count">{activeChallenges.length}</span>
              </h3>
              <div className="student-profile-challenges-list">
                {activeChallenges.map((sc) => (
                  <article key={sc.id} className="student-profile-challenge-row">
                    <div className="student-profile-challenge-icon">
                      {ChallengeIcon({ iconKey: sc.challenge.iconKey })}
                    </div>
                    <div>
                      <strong>{sc.challenge.title}</strong>
                      <div className="student-profile-challenge-meta">
                        <span>{renderStars(sc.challenge.difficultyStars)}</span>
                        <span className={`student-profile-challenge-status student-profile-challenge-status-${sc.status.toLowerCase()}`}>
                          {sc.status === 'IN_PROGRESS' ? 'En progreso' : 'Asignado'}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {/* Revenue history */}
          {revenueHistory.length > 0 ? (
            <section className="student-profile-section">
              <h3 className="student-profile-section-title">Historial de facturacion</h3>
              <div className="student-profile-revenue-list">
                {revenueHistory.map((entry, index) => (
                  <div key={`${entry.year}-${entry.month}`} className="student-profile-revenue-row">
                    <span>{entry.label}</span>
                    <strong>{formatCurrency(entry.revenue!)}</strong>
                    {index < revenueHistory.length - 1 && revenueHistory[index + 1]?.revenue ? (
                      <span className={
                        entry.revenue! >= revenueHistory[index + 1]!.revenue!
                          ? 'student-profile-revenue-up'
                          : 'student-profile-revenue-down'
                      }>
                        {entry.revenue! >= revenueHistory[index + 1]!.revenue! ? '▲' : '▼'}
                      </span>
                    ) : <span />}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Student info sidebar */}
          <section className="student-profile-section student-profile-info-section">
            <h3 className="student-profile-section-title">Informacion del alumno</h3>
            <dl className="student-profile-info-list">
              <div>
                <dt>Nombre completo</dt>
                <dd>{fullName}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{profile.user.email}</dd>
              </div>
              {profile.country ? (
                <div>
                  <dt>Pais</dt>
                  <dd>{profile.country}</dd>
                </div>
              ) : null}
              {profile.timezone ? (
                <div>
                  <dt>Zona horaria</dt>
                  <dd>{profile.timezone}</dd>
                </div>
              ) : null}
              {profile.localCurrency ? (
                <div>
                  <dt>Moneda local</dt>
                  <dd>{profile.localCurrency.code}{profile.localCurrency.symbol ? ` (${profile.localCurrency.symbol})` : ''}</dd>
                </div>
              ) : null}
              <div>
                <dt>Estado</dt>
                <dd>{profile.user.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</dd>
              </div>
              <div>
                <dt>Miembro desde</dt>
                <dd>{formatDate(profile.user.createdAt)}</dd>
              </div>
              {profile.user.lastLoginAt ? (
                <div>
                  <dt>Ultimo acceso</dt>
                  <dd>{formatDate(profile.user.lastLoginAt)}</dd>
                </div>
              ) : null}
              {mentors.length > 0 ? (
                <div>
                  <dt>Mentor{mentors.length > 1 ? 'es' : ''}</dt>
                  <dd>
                    {mentors.map((m) => `${m.firstName} ${m.lastName}`).join(', ')}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

        </div>
      </div>
    </AppShell>
  );
}
