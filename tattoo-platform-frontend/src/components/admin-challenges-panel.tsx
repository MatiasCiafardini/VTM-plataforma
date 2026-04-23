'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChallengeIcon, challengeIconOptions } from './challenge-icons';

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

type StudentOption = {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

type ManualStudentChallenge = {
  id: string;
  status: string;
  isManualAssignment: boolean;
  assignedAt: string;
  student: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  challenge: {
    id: string;
    title: string;
    difficultyStars: number;
  };
};

type ManageTab = 'templates' | 'manual';

function formatTargetValue(value: number | string, metric?: MetricDefinition | null) {
  const numericValue = Number(value);

  if (!metric) {
    return String(value);
  }

  if (metric.valueType === 'CURRENCY') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericValue);
  }

  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

function buildChallengeTitle(metric?: MetricDefinition, targetValue?: string) {
  if (!metric || !targetValue?.trim()) {
    return '';
  }

  return `${formatTargetValue(targetValue, metric)} en ${metric.name}`;
}

function buildChallengeDescription(
  metric?: MetricDefinition,
  targetValue?: string,
  stars?: number,
) {
  if (!metric || !targetValue?.trim()) {
    return '';
  }

  return `Alcanza ${formatTargetValue(targetValue, metric)} en ${metric.name.toLowerCase()} para desbloquear un desafio de ${stars ?? 1} estrella${stars === 1 ? '' : 's'}.`;
}

function renderStars(stars: number) {
  return '★'.repeat(stars);
}

function formatStudentLabel(student: StudentOption) {
  return `${student.user.firstName} ${student.user.lastName}`.trim();
}

export function AdminChallengesPanel({
  initialChallenges,
  metricDefinitions,
  students,
  initialManualAssignments,
}: {
  initialChallenges: ChallengeTemplate[];
  metricDefinitions: MetricDefinition[];
  students: StudentOption[];
  initialManualAssignments: ManualStudentChallenge[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ManageTab>('templates');
  const [challenges, setChallenges] = useState(initialChallenges);
  const [manualAssignments, setManualAssignments] = useState(
    initialManualAssignments,
  );
  const [metricDefinitionId, setMetricDefinitionId] = useState(
    metricDefinitions[0]?.id ?? '',
  );
  const [targetValue, setTargetValue] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [difficultyStars, setDifficultyStars] = useState(3);
  const [description, setDescription] = useState('');
  const [iconKey, setIconKey] = useState('trophy');
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardUrl, setRewardUrl] = useState('');
  const [prerequisiteChallengeId, setPrerequisiteChallengeId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studentQuery, setStudentQuery] = useState('');
  const [challengeQuery, setChallengeQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedChallengeId, setSelectedChallengeId] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);
  const [isAssigningManual, setIsAssigningManual] = useState(false);
  const [removingManualId, setRemovingManualId] = useState<string | null>(null);

  const selectedMetric = useMemo(
    () =>
      metricDefinitions.find((definition) => definition.id === metricDefinitionId) ??
      null,
    [metricDefinitionId, metricDefinitions],
  );

  const generatedTitle =
    customTitle.trim() || buildChallengeTitle(selectedMetric ?? undefined, targetValue);
  const generatedDescription = description.trim()
    ? description.trim()
    : buildChallengeDescription(
        selectedMetric ?? undefined,
        targetValue,
        difficultyStars,
      );

  const prerequisiteOptions = challenges.filter((c) => c.id !== editingId);

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();

    if (!query) {
      return students;
    }

    return students.filter((student) => {
      const name = formatStudentLabel(student).toLowerCase();
      return (
        name.includes(query) || student.user.email.toLowerCase().includes(query)
      );
    });
  }, [studentQuery, students]);

  const filteredChallenges = useMemo(() => {
    const query = challengeQuery.trim().toLowerCase();

    if (!query) {
      return challenges;
    }

    return challenges.filter((challenge) => {
      const metricName = challenge.metricDefinition?.name.toLowerCase() ?? '';
      return (
        challenge.title.toLowerCase().includes(query) ||
        metricName.includes(query) ||
        String(challenge.difficultyStars).includes(query)
      );
    });
  }, [challengeQuery, challenges]);

  function startEdit(challenge: ChallengeTemplate) {
    setActiveTab('templates');
    setEditingId(challenge.id);
    setMetricDefinitionId(challenge.metricDefinition?.id ?? '');
    setTargetValue(
      challenge.targetValue !== null ? String(challenge.targetValue) : '',
    );
    setCustomTitle(challenge.title);
    setDifficultyStars(challenge.difficultyStars);
    setDescription(challenge.description ?? '');
    setIconKey(challenge.iconKey || 'trophy');
    setRewardTitle(challenge.rewardTitle ?? '');
    setRewardUrl(challenge.rewardUrl ?? '');
    setPrerequisiteChallengeId(challenge.prerequisiteChallenge?.id ?? '');
    setIsActive(challenge.isActive);
    setError(null);
  }

  function resetTemplateForm() {
    setEditingId(null);
    setMetricDefinitionId(metricDefinitions[0]?.id ?? '');
    setTargetValue('');
    setCustomTitle('');
    setDifficultyStars(3);
    setDescription('');
    setIconKey('trophy');
    setRewardTitle('');
    setRewardUrl('');
    setPrerequisiteChallengeId('');
    setIsActive(true);
    setError(null);
  }

  async function handleTemplateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (!metricDefinitionId || !targetValue.trim()) {
        throw new Error('Selecciona una metrica y define la cantidad objetivo.');
      }

      const payload = {
        title: generatedTitle,
        description: generatedDescription || undefined,
        iconKey,
        rewardTitle: rewardTitle.trim() || undefined,
        rewardUrl: rewardUrl.trim() || undefined,
        metricDefinitionId,
        targetValue: Number(targetValue),
        difficultyStars,
        isActive,
        prerequisiteChallengeId: prerequisiteChallengeId || undefined,
      };

      const response = await fetch(
        editingId ? `/api/admin/challenges/${editingId}` : '/api/admin/challenges',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? 'No pudimos guardar el desafio.');
      }

      if (editingId) {
        setChallenges((current) =>
          current.map((challenge) => (challenge.id === editingId ? result : challenge)),
        );
      } else {
        setChallenges((current) => [result, ...current]);
      }

      resetTemplateForm();
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No pudimos guardar el desafio.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleManualAssign() {
    setIsAssigningManual(true);
    setManualError(null);
    setManualSuccess(null);

    try {
      if (!selectedStudentId || !selectedChallengeId) {
        throw new Error('Selecciona un alumno y un desafio.');
      }

      const response = await fetch('/api/admin/challenges/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          challengeId: selectedChallengeId,
          status: 'COMPLETED',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? 'No pudimos asignar el logro.');
      }

      setManualAssignments((current) => [result, ...current]);
      setManualSuccess('Logro asignado manualmente.');
      setSelectedStudentId('');
      setSelectedChallengeId('');
      router.refresh();
    } catch (submitError) {
      setManualError(
        submitError instanceof Error
          ? submitError.message
          : 'No pudimos asignar el logro.',
      );
    } finally {
      setIsAssigningManual(false);
    }
  }

  async function handleManualDelete(studentChallengeId: string) {
    setRemovingManualId(studentChallengeId);
    setManualError(null);
    setManualSuccess(null);

    try {
      const response = await fetch(
        `/api/admin/challenges/student-challenges/${studentChallengeId}`,
        {
          method: 'DELETE',
        },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? 'No pudimos eliminar el logro manual.');
      }

      setManualAssignments((current) =>
        current.filter((assignment) => assignment.id !== studentChallengeId),
      );
      setManualSuccess('Logro manual eliminado.');
      router.refresh();
    } catch (submitError) {
      setManualError(
        submitError instanceof Error
          ? submitError.message
          : 'No pudimos eliminar el logro manual.',
      );
    } finally {
      setRemovingManualId(null);
    }
  }

  return (
    <section className="admin-challenges-shell">
      <header className="admin-challenges-header">
        <div>
          <div className="admin-challenges-title-row">
            <span className="admin-challenges-title-icon">
              {ChallengeIcon({ iconKey: 'trophy' })}
            </span>
            <div>
              <h3>Gestion de Desafios</h3>
              <p>Crea logros, asignalos manualmente y administra excepciones.</p>
            </div>
          </div>
        </div>
        <div className="admin-challenges-header-actions">
          <Link
            className="ghost-button"
            href="/admin?tab=challenges"
            prefetch
            scroll={false}
          >
            Ver muro de logros
          </Link>
          <div className="admin-challenges-counter">
            <strong>{challenges.length}</strong>
            <span>Plantillas</span>
          </div>
        </div>
      </header>

      <div className="student-onboarding-tabs">
        <button
          className={
            activeTab === 'templates'
              ? 'student-onboarding-tab is-active'
              : 'student-onboarding-tab'
          }
          type="button"
          onClick={() => setActiveTab('templates')}
        >
          Plantillas
          <strong>{challenges.length} configuradas</strong>
        </button>
        <button
          className={
            activeTab === 'manual'
              ? 'student-onboarding-tab is-active'
              : 'student-onboarding-tab'
          }
          type="button"
          onClick={() => setActiveTab('manual')}
        >
          Logros manuales
          <strong>{manualAssignments.length} activos</strong>
        </button>
      </div>

      {activeTab === 'templates' ? (
        <>
          <article className="admin-challenges-intro-card">
            <p>
              Define desafios medibles para alumnos usando las metricas que ya
              cargan en resultados: facturacion, consultas, seguidores, cierres y
              mas.
            </p>
          </article>

          <div className="admin-challenges-layout">
            <form className="admin-challenge-form" onSubmit={handleTemplateSubmit}>
              <h4>{editingId ? 'Editar desafio' : 'Nuevo desafio'}</h4>

              <label>
                <span>Metrica objetivo</span>
                <select
                  value={metricDefinitionId}
                  onChange={(event) => setMetricDefinitionId(event.target.value)}
                >
                  <option value="">Seleccionar metrica</option>
                  {metricDefinitions.map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {definition.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Nombre del desafio (personalizado)</span>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(event) => setCustomTitle(event.target.value)}
                  placeholder={
                    buildChallengeTitle(selectedMetric ?? undefined, targetValue) ||
                    'Se genera automaticamente'
                  }
                />
              </label>

              <label>
                <span>Icono del desafio</span>
                <select
                  value={iconKey}
                  onChange={(event) => setIconKey(event.target.value)}
                >
                  {challengeIconOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Cantidad objetivo</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={targetValue}
                  onChange={(event) => setTargetValue(event.target.value)}
                  placeholder="Ej. 3000"
                  required
                />
              </label>

              <label>
                <span>Dificultad</span>
                <select
                  value={difficultyStars}
                  onChange={(event) => setDifficultyStars(Number(event.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value} estrella{value === 1 ? '' : 's'}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Se activa luego de completar</span>
                <select
                  value={prerequisiteChallengeId}
                  onChange={(event) =>
                    setPrerequisiteChallengeId(event.target.value)
                  }
                >
                  <option value="">
                    Sin requisito previo (disponible desde el inicio)
                  </option>
                  {prerequisiteOptions.map((challenge) => (
                    <option key={challenge.id} value={challenge.id}>
                      {renderStars(challenge.difficultyStars)} - {challenge.title}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Descripcion del logro</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Opcional. Si lo dejas vacio, se genera una descripcion automaticamente."
                  rows={4}
                />
              </label>

              <label>
                <span>Recompensa desbloqueable</span>
                <input
                  type="text"
                  value={rewardTitle}
                  onChange={(event) => setRewardTitle(event.target.value)}
                  placeholder="Ej. Clase de cierres por WhatsApp"
                />
              </label>

              <label>
                <span>Enlace de la recompensa</span>
                <input
                  type="url"
                  value={rewardUrl}
                  onChange={(event) => setRewardUrl(event.target.value)}
                  placeholder="https://..."
                />
              </label>

              <label className="admin-challenge-toggle">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                />
                <span>Desafio activo</span>
              </label>

              <article className="admin-challenge-preview-card">
                <span>Vista previa</span>
                <span className="admin-challenge-preview-icon" aria-hidden="true">
                  {ChallengeIcon({ iconKey })}
                </span>
                <strong>{generatedTitle || 'Selecciona una metrica y una meta'}</strong>
                <p>{generatedDescription || 'Todavia no hay descripcion.'}</p>
                {rewardTitle.trim() ? <p>Recompensa: {rewardTitle.trim()}</p> : null}
                {prerequisiteChallengeId ? (
                  <p className="admin-challenge-prereq-hint">
                    Se desbloquea al completar:{' '}
                    {prerequisiteOptions.find((c) => c.id === prerequisiteChallengeId)
                      ?.title ?? ''}
                  </p>
                ) : null}
                <em>{renderStars(difficultyStars)}</em>
              </article>

              {error ? <p className="student-results-form-error">{error}</p> : null}

              <div className="student-results-form-actions">
                {editingId ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={resetTemplateForm}
                  >
                    Cancelar
                  </button>
                ) : null}
                <button type="submit" className="primary-button" disabled={isSaving}>
                  {isSaving
                    ? 'Guardando...'
                    : editingId
                      ? 'Guardar cambios'
                      : 'Crear desafio'}
                </button>
              </div>
            </form>

            <div className="admin-challenges-list">
              {challenges.map((challenge) => (
                <article
                  className={`admin-challenge-card${challenge.prerequisiteChallenge ? ' admin-challenge-card-locked' : ''}`}
                  key={challenge.id}
                >
                  <div className="admin-challenge-card-top">
                    <div>
                      <span className="admin-challenge-preview-icon" aria-hidden="true">
                        {ChallengeIcon({ iconKey: challenge.iconKey })}
                      </span>
                      <h4>{challenge.title}</h4>
                      <p>{challenge.description ?? 'Sin descripcion por ahora.'}</p>
                    </div>
                    <div className="admin-challenge-card-badges">
                      {challenge.prerequisiteChallenge ? (
                        <span
                          className="admin-challenge-locked-badge"
                          title={`Requiere: ${challenge.prerequisiteChallenge.title}`}
                        >
                          🔒
                        </span>
                      ) : null}
                      <span
                        className={
                          challenge.isActive
                            ? 'student-results-status'
                            : 'admin-challenge-inactive'
                        }
                      >
                        {challenge.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>

                  {challenge.prerequisiteChallenge ? (
                    <p className="admin-challenge-prereq-copy">
                      Requiere completar:{' '}
                      <span>{renderStars(challenge.prerequisiteChallenge.difficultyStars)}</span>{' '}
                      {challenge.prerequisiteChallenge.title}
                    </p>
                  ) : null}

                  <div className="admin-challenge-card-meta">
                    <span>{challenge.metricDefinition?.name ?? 'Sin metrica'}</span>
                    <span>
                      Meta:{' '}
                      {challenge.targetValue !== null
                        ? formatTargetValue(
                            challenge.targetValue,
                            challenge.metricDefinition ?? undefined,
                          )
                        : '-'}
                    </span>
                    <span>{renderStars(challenge.difficultyStars)}</span>
                  </div>

                  {challenge.rewardTitle ? (
                    <p className="admin-challenge-reward-copy">
                      Recompensa: {challenge.rewardTitle}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => startEdit(challenge)}
                  >
                    Modificar
                  </button>
                </article>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="admin-challenges-layout">
          <section className="admin-challenge-form">
            <h4>Asignar logro completado</h4>

            <label>
              <span>Buscar alumno</span>
              <input
                type="text"
                value={studentQuery}
                onChange={(event) => setStudentQuery(event.target.value)}
                placeholder="Nombre o email"
              />
            </label>

            <label>
              <span>Alumno</span>
              <select
                value={selectedStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
              >
                <option value="">Seleccionar alumno</option>
                {filteredStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {formatStudentLabel(student)} - {student.user.email}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Buscar desafio</span>
              <input
                type="text"
                value={challengeQuery}
                onChange={(event) => setChallengeQuery(event.target.value)}
                placeholder="Nombre, metrica o estrellas"
              />
            </label>

            <label>
              <span>Desafio</span>
              <select
                value={selectedChallengeId}
                onChange={(event) => setSelectedChallengeId(event.target.value)}
              >
                <option value="">Seleccionar desafio</option>
                {filteredChallenges.map((challenge) => (
                  <option key={challenge.id} value={challenge.id}>
                    {renderStars(challenge.difficultyStars)} - {challenge.title}
                  </option>
                ))}
              </select>
            </label>

            {manualSuccess ? (
              <p className="student-results-form-success">{manualSuccess}</p>
            ) : null}
            {manualError ? (
              <p className="student-results-form-error">{manualError}</p>
            ) : null}

            <div className="student-results-form-actions">
              <button
                type="button"
                className="primary-button"
                disabled={isAssigningManual}
                onClick={() => void handleManualAssign()}
              >
                {isAssigningManual ? 'Asignando...' : 'Asignar logro'}
              </button>
            </div>
          </section>

          <div className="admin-challenges-list">
            <article className="admin-challenges-intro-card">
              <p>
                Abajo ves solo los logros que fueron marcados manualmente desde este
                panel. Los automaticos siguen viviendo por separado.
              </p>
            </article>

            {manualAssignments.length === 0 ? (
              <article className="admin-challenge-card">
                <h4>Sin logros manuales</h4>
                <p>Todavia no se asignaron logros completados de forma manual.</p>
              </article>
            ) : (
              manualAssignments.map((assignment) => (
                <article className="admin-challenge-card" key={assignment.id}>
                  <div className="admin-challenge-card-top">
                    <div>
                      <h4>{assignment.challenge.title}</h4>
                      <p>
                        {formatStudentLabel(assignment.student)} -{' '}
                        {assignment.student.user.email}
                      </p>
                    </div>
                    <div className="admin-challenge-card-badges">
                      <span className="student-results-status">
                        {renderStars(assignment.challenge.difficultyStars)}
                      </span>
                    </div>
                  </div>

                  <div className="admin-challenge-card-meta">
                    <span>Estado: {assignment.status}</span>
                    <span>
                      Asignado manualmente el{' '}
                      {new Intl.DateTimeFormat('es-AR', {
                        dateStyle: 'medium',
                      }).format(new Date(assignment.assignedAt))}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="ghost-button"
                    disabled={removingManualId === assignment.id}
                    onClick={() => void handleManualDelete(assignment.id)}
                  >
                    {removingManualId === assignment.id
                      ? 'Eliminando...'
                      : 'Eliminar logro'}
                  </button>
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
