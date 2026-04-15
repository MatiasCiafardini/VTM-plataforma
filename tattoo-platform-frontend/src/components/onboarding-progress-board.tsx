'use client';

import { useDeferredValue, useMemo, useState } from 'react';

export type OnboardingStudentSummary = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    country: string | null;
  };
  summary: {
    progressPercentage: number;
    completedSteps: number;
    pendingSteps: number;
    currentPhaseTitle: string | null;
    nextStepTitle: string | null;
    lastProgressAt: string | null;
    isCompleted: boolean;
  };
  phases: Array<{
    id: string;
    title: string;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    progressPercentage: number;
    completedSteps: number;
    pendingSteps: number;
  }>;
};

function formatDate(value: string | null) {
  if (!value) {
    return 'Sin avances aun';
  }

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getPhaseTone(status: OnboardingStudentSummary['phases'][number]['status']) {
  if (status === 'COMPLETED') {
    return 'status-chip status-green';
  }

  if (status === 'IN_PROGRESS') {
    return 'status-chip status-yellow';
  }

  return 'status-chip status-neutral';
}

function getStudentLabel(student: OnboardingStudentSummary) {
  if (student.summary.isCompleted) {
    return 'Roadmap completo';
  }

  if (student.summary.progressPercentage >= 60) {
    return 'Buen avance';
  }

  if (student.summary.progressPercentage > 0) {
    return 'En progreso';
  }

  return 'Sin iniciar';
}

export function OnboardingProgressBoard({
  students,
  title,
  subtitle,
}: {
  students: OnboardingStudentSummary[];
  title: string;
  subtitle: string;
}) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const fullName = `${student.student.firstName} ${student.student.lastName}`.toLowerCase();
        return (
          !normalizedQuery ||
          fullName.includes(normalizedQuery) ||
          student.student.email.toLowerCase().includes(normalizedQuery) ||
          (student.student.country ?? '').toLowerCase().includes(normalizedQuery)
        );
      }),
    [normalizedQuery, students],
  );

  return (
    <section className="onboarding-board-shell">
      <header className="onboarding-board-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className="onboarding-board-search">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar alumno..."
          />
        </div>
      </header>

      <div className="onboarding-board-list">
        {filteredStudents.length === 0 ? (
          <article className="list-card">
            <p>No encontramos alumnos para ese filtro.</p>
          </article>
        ) : (
          filteredStudents.map((student) => {
            const fullName = `${student.student.firstName} ${student.student.lastName}`;

            return (
              <details className="onboarding-board-card" key={student.student.id}>
                <summary className="onboarding-board-summary">
                  <div>
                    <strong>{fullName}</strong>
                    <p>{student.student.email}</p>
                    <div className="onboarding-board-summary-meta">
                      <span className="student-management-status">
                        {getStudentLabel(student)}
                      </span>
                      {student.student.country ? <span>{student.student.country}</span> : null}
                    </div>
                  </div>

                  <div className="onboarding-board-summary-side">
                    <div className="onboarding-board-progress-copy">
                      <strong>{student.summary.progressPercentage}%</strong>
                      <span>
                        {student.summary.completedSteps} completados · {student.summary.pendingSteps}{' '}
                        pendientes
                      </span>
                    </div>
                    <div className="onboarding-board-track">
                      <span style={{ width: `${student.summary.progressPercentage}%` }} />
                    </div>
                  </div>
                </summary>

                <div className="onboarding-board-expanded">
                  <div className="onboarding-board-topline">
                    <div>
                      <span className="list-row-label">Fase actual</span>
                      <strong>{student.summary.currentPhaseTitle ?? 'Roadmap finalizado'}</strong>
                    </div>
                    <div>
                      <span className="list-row-label">Siguiente paso</span>
                      <strong>{student.summary.nextStepTitle ?? 'Sin pendientes'}</strong>
                    </div>
                    <div>
                      <span className="list-row-label">Ultimo avance</span>
                      <strong>{formatDate(student.summary.lastProgressAt)}</strong>
                    </div>
                  </div>

                  <div className="onboarding-board-phase-list">
                    {student.phases.map((phase) => (
                      <article className="onboarding-board-phase-card" key={phase.id}>
                        <div className="onboarding-board-phase-head">
                          <strong>{phase.title}</strong>
                          <span className={getPhaseTone(phase.status)}>
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
                </div>
              </details>
            );
          })
        )}
      </div>
    </section>
  );
}
