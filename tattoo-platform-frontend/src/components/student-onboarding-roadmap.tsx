'use client';

import Link from 'next/link';
import { startTransition, useState } from 'react';

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

function getPhaseStatusCopy(status: StudentOnboardingRoadmapData['phases'][number]['status']) {
  if (status === 'COMPLETED') {
    return 'Completada';
  }

  if (status === 'IN_PROGRESS') {
    return 'En progreso';
  }

  return 'No iniciada';
}

function getPhaseVisualStatus(phase: StudentOnboardingRoadmapData['phases'][number]) {
  if (phase.isLocked) {
    return 'Bloqueada';
  }

  return getPhaseStatusCopy(phase.status);
}

function getStepKindCopy(
  stepKind: StudentOnboardingRoadmapData['phases'][number]['steps'][number]['stepKind'],
) {
  if (stepKind === 'CLASS') {
    return 'Clase';
  }

  if (stepKind === 'MEETING') {
    return 'Reunion';
  }

  if (stepKind === 'RESOURCE') {
    return 'Recurso';
  }

  return 'Accion';
}

function formatCompletedAt(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function StudentOnboardingRoadmap({
  initialData,
}: {
  initialData: StudentOnboardingRoadmapData;
}) {
  const [data, setData] = useState(initialData);
  const [pendingStepId, setPendingStepId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateStep(stepId: string, isCompleted: boolean) {
    setPendingStepId(stepId);
    setError(null);

    try {
      const response = await fetch(`/api/onboarding/steps/${stepId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? 'No pudimos actualizar el paso.');
      }

      startTransition(() => {
        setData(payload);
      });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No pudimos actualizar el paso.');
    } finally {
      setPendingStepId(null);
    }
  }

  return (
    <section className="onboarding-student-shell">
      <header className="onboarding-student-hero">
        <div className="onboarding-student-hero-copy">
          <p className="eyebrow">Roadmap de mentoria</p>
          <h1>On boarding</h1>
          <p>
            Sigue el camino completo de la mentoria, marca avances y manten claro cual es el
            siguiente paso recomendado.
          </p>
        </div>

        <div className="onboarding-student-hero-aside">
          <span>Progreso general</span>
          <strong>{data.summary.progressPercentage}%</strong>
          <p>
            {data.summary.completedSteps} completados · {data.summary.pendingSteps} pendientes
          </p>
        </div>
      </header>

      <section className="onboarding-student-summary-grid">
        <article className="summary-card onboarding-student-summary-card onboarding-student-summary-card-accent">
          <span>Siguiente paso</span>
          <strong>{data.summary.nextStep?.title ?? 'Roadmap completo'}</strong>
          <p>{data.summary.nextStep?.phaseTitle ?? 'No quedan pasos pendientes.'}</p>
        </article>
        <article className="summary-card onboarding-student-summary-card">
          <span>Fase actual</span>
          <strong>{data.summary.currentPhaseTitle ?? 'Finalizado'}</strong>
          <p>
            {data.summary.isCompleted
              ? 'Terminaste todo el onboarding.'
              : 'En esta fase esta tu foco principal ahora.'}
          </p>
        </article>
        <article className="summary-card onboarding-student-summary-card">
          <span>Configuracion inicial</span>
          <strong>Setup de la app</strong>
          <p>Completa o ajusta tu informacion base y tu primer periodo cuando lo necesites.</p>
          <Link className="ghost-button onboarding-inline-button" href="/student/setup">
            Ir al setup
          </Link>
        </article>
      </section>

      <article className="onboarding-student-progress-card">
        <div className="onboarding-student-progress-head">
          <strong>Barra general</strong>
          <span>{data.summary.progressPercentage}%</span>
        </div>
        <div className="onboarding-student-progress-track">
          <span style={{ width: `${data.summary.progressPercentage}%` }} />
        </div>
      </article>

      {error ? <p className="student-results-form-error">{error}</p> : null}

      <div className="onboarding-student-phase-list">
        {data.phases.map((phase) => (
          <details
            className={`onboarding-student-phase-card${phase.isLocked ? ' onboarding-student-phase-card-locked' : ''}`}
            key={phase.id}
            open={!phase.isLocked && phase.status === 'IN_PROGRESS'}
          >
            <summary className="onboarding-student-phase-summary">
              <div>
                <strong>{phase.title}</strong>
                <p>
                  {phase.isLocked
                    ? 'Se desbloquea cuando completes por completo la fase anterior.'
                    : phase.description ?? 'Fase del roadmap de mentoria.'}
                </p>
              </div>
              <div className="onboarding-student-phase-summary-side">
                <span
                  className={
                    phase.isLocked
                      ? 'status-chip status-neutral'
                      : phase.status === 'COMPLETED'
                        ? 'status-chip status-green'
                        : phase.status === 'IN_PROGRESS'
                          ? 'status-chip status-yellow'
                          : 'status-chip status-neutral'
                  }
                >
                  {getPhaseVisualStatus(phase)}
                </span>
                <strong>{phase.progressPercentage}%</strong>
              </div>
            </summary>

            {!phase.isLocked ? (
              <div className="onboarding-student-phase-body">
                <div className="onboarding-student-phase-track">
                  <span style={{ width: `${phase.progressPercentage}%` }} />
                </div>

                <div className="onboarding-student-phase-meta">
                  <span>{phase.completedSteps} completados</span>
                  <span>{phase.pendingSteps} pendientes</span>
                </div>

                <div className="onboarding-student-step-list">
                  {phase.steps.map((step) => {
                    const isNext = data.summary.nextStep?.id === step.id;
                    const completionCopy =
                      step.completionMode === 'STAFF_ONLY'
                        ? 'Lo valida mentor o admin'
                        : step.completionMode === 'AUTOMATIC'
                          ? 'Se completa automaticamente'
                          : 'Lo puedes marcar tu';

                    return (
                      <article
                        className={`onboarding-student-step-card${step.isCompleted ? ' onboarding-student-step-card-completed' : ''}${isNext ? ' onboarding-student-step-card-next' : ''}`}
                        key={step.id}
                      >
                        <div className="onboarding-student-step-head">
                          <div>
                            <div className="onboarding-student-step-title-row">
                              <strong>{step.title}</strong>
                              {isNext ? <span className="onboarding-next-badge">Siguiente</span> : null}
                            </div>
                            <div className="onboarding-student-step-badges">
                              <span className="status-chip status-neutral">{getStepKindCopy(step.stepKind)}</span>
                              {step.isOptional ? <span className="status-chip status-neutral">Opcional</span> : null}
                              {step.challenge ? (
                                <span className="status-chip status-yellow">Vinculado a desafio</span>
                              ) : null}
                            </div>
                          </div>

                          <button
                            type="button"
                            className={step.isCompleted ? 'ghost-button' : 'primary-button'}
                            disabled={!step.canStudentComplete || pendingStepId === step.id}
                            onClick={() => updateStep(step.id, !step.isCompleted)}
                          >
                            {pendingStepId === step.id
                              ? 'Guardando...'
                              : step.isCompleted
                                ? 'Marcar pendiente'
                                : 'Marcar realizado'}
                          </button>
                        </div>

                        {step.description ? <p>{step.description}</p> : null}

                        <div className="onboarding-student-step-meta">
                          <div>
                            <span className="list-row-label">Donde encontrarlo</span>
                            <strong>{step.locationHint ?? 'Dentro de la mentoria o con tu mentor.'}</strong>
                          </div>
                          <div>
                            <span className="list-row-label">Como se completa</span>
                            <strong>{completionCopy}</strong>
                          </div>
                          <div>
                            <span className="list-row-label">Estado</span>
                            <strong>{step.isCompleted ? 'Completado' : 'Pendiente'}</strong>
                          </div>
                        </div>

                        {step.resources.length > 0 ? (
                          <div className="onboarding-student-resource-list">
                            {step.resources.map((resource) =>
                              resource.url.startsWith('/') ? (
                                <Link
                                  key={resource.id}
                                  href={resource.url}
                                  className="ghost-button onboarding-inline-button"
                                >
                                  {resource.label}
                                </Link>
                              ) : (
                                <a
                                  key={resource.id}
                                  href={resource.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="ghost-button onboarding-inline-button"
                                >
                                  {resource.label}
                                </a>
                              ),
                            )}
                          </div>
                        ) : null}

                        {step.challenge ? (
                          <div className="onboarding-student-linked-challenge">
                            <span className="list-row-label">Desafio relacionado</span>
                            <strong>{step.challenge.title}</strong>
                            {step.challenge.rewardTitle ? (
                              <p>Recompensa asociada: {step.challenge.rewardTitle}</p>
                            ) : null}
                          </div>
                        ) : null}

                        {step.isCompleted && step.completedAt ? (
                          <div className="onboarding-student-step-complete-copy">
                            <span suppressHydrationWarning>Completado {formatCompletedAt(step.completedAt)}</span>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </details>
        ))}
      </div>
    </section>
  );
}
