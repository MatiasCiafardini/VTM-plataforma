'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useMemo, useState } from 'react';
import {
  OnboardingProgressBoard,
  type OnboardingStudentSummary,
} from './onboarding-progress-board';

type ChallengeOption = {
  id: string;
  title: string;
  iconKey: string;
  metricDefinition: {
    id: string;
    name: string;
  } | null;
};

type AdminRoadmapData = {
  roadmap: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    isActive: boolean;
  };
  phases: Array<{
    id: string;
    title: string;
    description: string | null;
    notesInternal: string | null;
    sortOrder: number;
    isActive: boolean;
    countsForProgress: boolean;
    steps: Array<{
      id: string;
      phaseId: string;
      title: string;
      description: string | null;
      locationHint: string | null;
      notesInternal: string | null;
      stepKind: 'CLASS' | 'MEETING' | 'RESOURCE' | 'ACTION_MANUAL';
      completionMode: 'SELF_SERVICE' | 'STAFF_ONLY' | 'AUTOMATIC';
      automationKey: string | null;
      sortOrder: number;
      isActive: boolean;
      isOptional: boolean;
      countsForProgress: boolean;
      challengeId: string | null;
      challenge: {
        id: string;
        title: string;
        iconKey: string;
      } | null;
      resources: Array<{
        id: string;
        label: string;
        url: string;
        sortOrder: number;
      }>;
    }>;
  }>;
};

function serializeResources(
  resources: Array<{ label: string; url: string; sortOrder?: number }>,
) {
  return resources.map((resource) => `${resource.label} | ${resource.url}`).join('\n');
}

function parseResources(input: string) {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [label, ...urlParts] = line.split('|').map((chunk) => chunk.trim());
      return {
        label: label || `Recurso ${index + 1}`,
        url: urlParts.join(' | ') || '',
        sortOrder: index,
      };
    })
    .filter((resource) => resource.url);
}

export function AdminOnboardingPanel({
  initialRoadmap,
  students,
  challenges,
}: {
  initialRoadmap: AdminRoadmapData;
  students: OnboardingStudentSummary[];
  challenges: ChallengeOption[];
}) {
  const router = useRouter();
  const [roadmap, setRoadmap] = useState(initialRoadmap);
  const [phaseForm, setPhaseForm] = useState({
    id: '',
    title: '',
    description: '',
    notesInternal: '',
    sortOrder: String(initialRoadmap.phases.length + 1),
    isActive: true,
    countsForProgress: true,
  });
  const [stepForm, setStepForm] = useState({
    id: '',
    phaseId: initialRoadmap.phases[0]?.id ?? '',
    title: '',
    description: '',
    locationHint: '',
    notesInternal: '',
    stepKind: 'ACTION_MANUAL',
    completionMode: 'SELF_SERVICE',
    automationKey: '',
    sortOrder: '0',
    isActive: true,
    isOptional: false,
    countsForProgress: true,
    challengeId: '',
    resourcesText: '',
  });
  const [isSavingPhase, setIsSavingPhase] = useState(false);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phaseOptions = useMemo(
    () => [...roadmap.phases].sort((left, right) => left.sortOrder - right.sortOrder),
    [roadmap.phases],
  );

  function resetPhaseForm() {
    setPhaseForm({
      id: '',
      title: '',
      description: '',
      notesInternal: '',
      sortOrder: String(roadmap.phases.length + 1),
      isActive: true,
      countsForProgress: true,
    });
  }

  function resetStepForm() {
    setStepForm({
      id: '',
      phaseId: phaseOptions[0]?.id ?? '',
      title: '',
      description: '',
      locationHint: '',
      notesInternal: '',
      stepKind: 'ACTION_MANUAL',
      completionMode: 'SELF_SERVICE',
      automationKey: '',
      sortOrder: '0',
      isActive: true,
      isOptional: false,
      countsForProgress: true,
      challengeId: '',
      resourcesText: '',
    });
  }

  async function handlePhaseSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingPhase(true);
    setError(null);

    try {
      const response = await fetch(
        phaseForm.id
          ? `/api/admin/onboarding/phases/${phaseForm.id}`
          : '/api/admin/onboarding/phases',
        {
          method: phaseForm.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: phaseForm.title,
            description: phaseForm.description || undefined,
            notesInternal: phaseForm.notesInternal || undefined,
            sortOrder: Number(phaseForm.sortOrder),
            isActive: phaseForm.isActive,
            countsForProgress: phaseForm.countsForProgress,
          }),
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? 'No pudimos guardar la fase.');
      }

      startTransition(() => {
        setRoadmap(payload);
        resetPhaseForm();
      });
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No pudimos guardar la fase.');
    } finally {
      setIsSavingPhase(false);
    }
  }

  async function handleStepSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingStep(true);
    setError(null);

    try {
      const response = await fetch(
        stepForm.id
          ? `/api/admin/onboarding/steps/${stepForm.id}`
          : '/api/admin/onboarding/steps',
        {
          method: stepForm.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phaseId: stepForm.phaseId,
            title: stepForm.title,
            description: stepForm.description || undefined,
            locationHint: stepForm.locationHint || undefined,
            notesInternal: stepForm.notesInternal || undefined,
            stepKind: stepForm.stepKind,
            completionMode: stepForm.completionMode,
            automationKey: stepForm.automationKey || undefined,
            sortOrder: Number(stepForm.sortOrder),
            isActive: stepForm.isActive,
            isOptional: stepForm.isOptional,
            countsForProgress: stepForm.countsForProgress,
            challengeId: stepForm.challengeId || undefined,
            resources: parseResources(stepForm.resourcesText),
          }),
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? 'No pudimos guardar el paso.');
      }

      startTransition(() => {
        setRoadmap(payload);
        resetStepForm();
      });
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No pudimos guardar el paso.');
    } finally {
      setIsSavingStep(false);
    }
  }

  async function deletePhase(phaseId: string) {
    setError(null);
    const response = await fetch(`/api/admin/onboarding/phases/${phaseId}`, {
      method: 'DELETE',
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.message ?? 'No pudimos eliminar la fase.');
      return;
    }

    startTransition(() => setRoadmap(payload));
    router.refresh();
  }

  async function deleteStep(stepId: string) {
    setError(null);
    const response = await fetch(`/api/admin/onboarding/steps/${stepId}`, {
      method: 'DELETE',
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.message ?? 'No pudimos eliminar el paso.');
      return;
    }

    startTransition(() => setRoadmap(payload));
    router.refresh();
  }

  function startEditPhase(phase: AdminRoadmapData['phases'][number]) {
    setPhaseForm({
      id: phase.id,
      title: phase.title,
      description: phase.description ?? '',
      notesInternal: phase.notesInternal ?? '',
      sortOrder: String(phase.sortOrder),
      isActive: phase.isActive,
      countsForProgress: phase.countsForProgress,
    });
  }

  function startEditStep(
    step: AdminRoadmapData['phases'][number]['steps'][number],
  ) {
    setStepForm({
      id: step.id,
      phaseId: step.phaseId,
      title: step.title,
      description: step.description ?? '',
      locationHint: step.locationHint ?? '',
      notesInternal: step.notesInternal ?? '',
      stepKind: step.stepKind,
      completionMode: step.completionMode,
      automationKey: step.automationKey ?? '',
      sortOrder: String(step.sortOrder),
      isActive: step.isActive,
      isOptional: step.isOptional,
      countsForProgress: step.countsForProgress,
      challengeId: step.challengeId ?? '',
      resourcesText: serializeResources(step.resources),
    });
  }

  return (
    <section className="admin-onboarding-shell">
      <header className="admin-challenges-header">
        <div>
          <div className="admin-challenges-title-row">
            <span className="admin-challenges-title-icon">#</span>
            <div>
              <h3>On boarding</h3>
              <p>Administra el roadmap, sus fases, los pasos y el progreso de cada alumno.</p>
            </div>
          </div>
        </div>
      </header>

      <section className="mentor-stats-grid">
        <article className="summary-card metric-card mentor-stat-card">
          <div className="metric-card-top">
            <span>Fases activas</span>
            <span className="metric-card-icon">#</span>
          </div>
          <strong>{roadmap.phases.filter((phase) => phase.isActive).length}</strong>
          <p>Dentro del roadmap actual</p>
        </article>
        <article className="summary-card metric-card mentor-stat-card">
          <div className="metric-card-top">
            <span>Pasos activos</span>
            <span className="metric-card-icon">/</span>
          </div>
          <strong>
            {roadmap.phases.reduce(
              (sum, phase) => sum + phase.steps.filter((step) => step.isActive).length,
              0,
            )}
          </strong>
          <p>Configurados para alumnos</p>
        </article>
        <article className="summary-card metric-card mentor-stat-card">
          <div className="metric-card-top">
            <span>Alumnos</span>
            <span className="metric-card-icon">[]</span>
          </div>
          <strong>{students.length}</strong>
          <p>Con seguimiento disponible</p>
        </article>
        <article className="summary-card metric-card mentor-stat-card">
          <div className="metric-card-top">
            <span>Promedio</span>
            <span className="metric-card-icon">%</span>
          </div>
          <strong>
            {students.length > 0
              ? Math.round(
                  students.reduce(
                    (sum, student) => sum + student.summary.progressPercentage,
                    0,
                  ) / students.length,
                )
              : 0}
            %
          </strong>
          <p>Avance general del onboarding</p>
        </article>
      </section>

      <OnboardingProgressBoard
        students={students}
        title="Seguimiento por alumno"
        subtitle="Mentoría y administración pueden ver rápido en qué fase está cada alumno y cuál es el siguiente paso."
      />

      <div className="admin-onboarding-layout">
        <form className="admin-challenge-form" onSubmit={handlePhaseSubmit}>
          <h4>{phaseForm.id ? 'Editar fase' : 'Nueva fase'}</h4>

          <label>
            <span>Título</span>
            <input
              type="text"
              value={phaseForm.title}
              onChange={(event) =>
                setPhaseForm((current) => ({ ...current, title: event.target.value }))
              }
              required
            />
          </label>

          <label>
            <span>Descripción</span>
            <textarea
              rows={4}
              value={phaseForm.description}
              onChange={(event) =>
                setPhaseForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </label>

          <label>
            <span>Notas internas</span>
            <textarea
              rows={3}
              value={phaseForm.notesInternal}
              onChange={(event) =>
                setPhaseForm((current) => ({ ...current, notesInternal: event.target.value }))
              }
            />
          </label>

          <label>
            <span>Orden</span>
            <input
              type="number"
              min="0"
              value={phaseForm.sortOrder}
              onChange={(event) =>
                setPhaseForm((current) => ({ ...current, sortOrder: event.target.value }))
              }
            />
          </label>

          <label className="admin-challenge-toggle">
            <input
              type="checkbox"
              checked={phaseForm.isActive}
              onChange={(event) =>
                setPhaseForm((current) => ({ ...current, isActive: event.target.checked }))
              }
            />
            <span>Fase activa</span>
          </label>

          <label className="admin-challenge-toggle">
            <input
              type="checkbox"
              checked={phaseForm.countsForProgress}
              onChange={(event) =>
                setPhaseForm((current) => ({
                  ...current,
                  countsForProgress: event.target.checked,
                }))
              }
            />
            <span>Contar para progreso</span>
          </label>

          <div className="student-results-form-actions">
            {phaseForm.id ? (
              <button type="button" className="ghost-button" onClick={resetPhaseForm}>
                Cancelar
              </button>
            ) : null}
            <button type="submit" className="primary-button" disabled={isSavingPhase}>
              {isSavingPhase ? 'Guardando...' : phaseForm.id ? 'Guardar fase' : 'Crear fase'}
            </button>
          </div>
        </form>

        <form className="admin-challenge-form" onSubmit={handleStepSubmit}>
          <h4>{stepForm.id ? 'Editar paso' : 'Nuevo paso'}</h4>

          <label>
            <span>Fase</span>
            <select
              value={stepForm.phaseId}
              onChange={(event) =>
                setStepForm((current) => ({ ...current, phaseId: event.target.value }))
              }
            >
              {phaseOptions.map((phase) => (
                <option key={phase.id} value={phase.id}>
                  {phase.title}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Título</span>
            <input
              type="text"
              value={stepForm.title}
              onChange={(event) =>
                setStepForm((current) => ({ ...current, title: event.target.value }))
              }
              required
            />
          </label>

          <label>
            <span>Descripción</span>
            <textarea
              rows={4}
              value={stepForm.description}
              onChange={(event) =>
                setStepForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </label>

          <label>
            <span>Ubicación / referencia</span>
            <input
              type="text"
              value={stepForm.locationHint}
              onChange={(event) =>
                setStepForm((current) => ({ ...current, locationHint: event.target.value }))
              }
            />
          </label>

          <label>
            <span>Links y recursos</span>
            <textarea
              rows={4}
              value={stepForm.resourcesText}
              onChange={(event) =>
                setStepForm((current) => ({ ...current, resourcesText: event.target.value }))
              }
              placeholder="Ejemplo: Ver clase | https://...\nSetup inicial | /student/setup"
            />
          </label>

          <label>
            <span>Notas internas</span>
            <textarea
              rows={3}
              value={stepForm.notesInternal}
              onChange={(event) =>
                setStepForm((current) => ({ ...current, notesInternal: event.target.value }))
              }
            />
          </label>

          <label>
            <span>Tipo de paso</span>
            <select
              value={stepForm.stepKind}
              onChange={(event) =>
                setStepForm((current) => ({ ...current, stepKind: event.target.value as never }))
              }
            >
              <option value="ACTION_MANUAL">Acción manual</option>
              <option value="CLASS">Clase</option>
              <option value="MEETING">Reunión</option>
              <option value="RESOURCE">Recurso</option>
            </select>
          </label>

          <label>
            <span>Modo de completado</span>
            <select
              value={stepForm.completionMode}
              onChange={(event) =>
                setStepForm((current) => ({
                  ...current,
                  completionMode: event.target.value as never,
                }))
              }
            >
              <option value="SELF_SERVICE">Auto completado por alumno</option>
              <option value="STAFF_ONLY">Sólo mentor/admin</option>
              <option value="AUTOMATIC">Automático</option>
            </select>
          </label>

          <label>
            <span>Automatización</span>
            <select
              value={stepForm.automationKey}
              onChange={(event) =>
                setStepForm((current) => ({ ...current, automationKey: event.target.value }))
              }
            >
              <option value="">Sin automatización</option>
              <option value="STUDENT_ACCOUNT_CREATED">Cuenta creada</option>
              <option value="INITIAL_PROFILE_COMPLETED">Perfil inicial completo</option>
              <option value="FIRST_METRIC_PERIOD_SUBMITTED">Primer periodo enviado</option>
            </select>
          </label>

          <label>
            <span>Desafío vinculado</span>
            <select
              value={stepForm.challengeId}
              onChange={(event) =>
                setStepForm((current) => ({ ...current, challengeId: event.target.value }))
              }
            >
              <option value="">Sin desafío vinculado</option>
              {challenges.map((challenge) => (
                <option key={challenge.id} value={challenge.id}>
                  {challenge.title}
                  {challenge.metricDefinition ? ` · ${challenge.metricDefinition.name}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Orden</span>
            <input
              type="number"
              min="0"
              value={stepForm.sortOrder}
              onChange={(event) =>
                setStepForm((current) => ({ ...current, sortOrder: event.target.value }))
              }
            />
          </label>

          <label className="admin-challenge-toggle">
            <input
              type="checkbox"
              checked={stepForm.isActive}
              onChange={(event) =>
                setStepForm((current) => ({ ...current, isActive: event.target.checked }))
              }
            />
            <span>Paso activo</span>
          </label>

          <label className="admin-challenge-toggle">
            <input
              type="checkbox"
              checked={stepForm.countsForProgress}
              onChange={(event) =>
                setStepForm((current) => ({
                  ...current,
                  countsForProgress: event.target.checked,
                }))
              }
            />
            <span>Contar para progreso</span>
          </label>

          <label className="admin-challenge-toggle">
            <input
              type="checkbox"
              checked={stepForm.isOptional}
              onChange={(event) =>
                setStepForm((current) => ({ ...current, isOptional: event.target.checked }))
              }
            />
            <span>Paso opcional</span>
          </label>

          {error ? <p className="student-results-form-error">{error}</p> : null}

          <div className="student-results-form-actions">
            {stepForm.id ? (
              <button type="button" className="ghost-button" onClick={resetStepForm}>
                Cancelar
              </button>
            ) : null}
            <button type="submit" className="primary-button" disabled={isSavingStep}>
              {isSavingStep ? 'Guardando...' : stepForm.id ? 'Guardar paso' : 'Crear paso'}
            </button>
          </div>
        </form>
      </div>

      <div className="admin-onboarding-roadmap-list">
        {phaseOptions.map((phase) => (
          <article className="admin-onboarding-phase-card" key={phase.id}>
            <div className="admin-onboarding-phase-head">
              <div>
                <strong>{phase.title}</strong>
                <p>{phase.description ?? 'Sin descripción cargada.'}</p>
              </div>
              <div className="admin-onboarding-phase-actions">
                <span className={phase.isActive ? 'status-chip status-green' : 'status-chip status-neutral'}>
                  {phase.isActive ? 'Activa' : 'Inactiva'}
                </span>
                <button type="button" className="ghost-button" onClick={() => startEditPhase(phase)}>
                  Editar fase
                </button>
                <button type="button" className="ghost-button" onClick={() => deletePhase(phase.id)}>
                  Eliminar
                </button>
              </div>
            </div>

            <div className="admin-onboarding-step-grid">
              {phase.steps
                .slice()
                .sort((left, right) => left.sortOrder - right.sortOrder)
                .map((step) => (
                  <article className="admin-onboarding-step-card" key={step.id}>
                    <div className="admin-onboarding-step-head">
                      <strong>{step.title}</strong>
                      <span className={step.isActive ? 'status-chip status-yellow' : 'status-chip status-neutral'}>
                        {step.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    {step.description ? <p>{step.description}</p> : null}
                    <div className="admin-onboarding-step-meta">
                      <span>{step.stepKind}</span>
                      <span>{step.completionMode}</span>
                      <span>Orden {step.sortOrder}</span>
                    </div>
                    {step.locationHint ? (
                      <p className="admin-onboarding-step-location">{step.locationHint}</p>
                    ) : null}
                    {step.challenge ? (
                      <p className="admin-onboarding-step-location">
                        Desafío: {step.challenge.title}
                      </p>
                    ) : null}
                    {step.resources.length > 0 ? (
                      <div className="admin-onboarding-step-resources">
                        {step.resources.map((resource) => (
                          <span key={resource.id}>{resource.label}</span>
                        ))}
                      </div>
                    ) : null}
                    <div className="admin-onboarding-step-actions">
                      <button type="button" className="ghost-button" onClick={() => startEditStep(step)}>
                        Editar paso
                      </button>
                      <button type="button" className="ghost-button" onClick={() => deleteStep(step.id)}>
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
