'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type ChallengeTemplate = {
  id: string;
  title: string;
  description: string | null;
  targetValue: number | null;
  difficultyStars: number;
  isActive: boolean;
  metricDefinition: {
    id: string;
    name: string;
    slug: string;
    valueType: 'INTEGER' | 'DECIMAL' | 'CURRENCY' | 'TEXT' | 'BOOLEAN';
  } | null;
};

type MetricDefinition = {
  id: string;
  name: string;
  slug: string;
  valueType: 'INTEGER' | 'DECIMAL' | 'CURRENCY' | 'TEXT' | 'BOOLEAN';
};

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 3h8v3a4 4 0 0 0 3 3.87V11a7 7 0 0 1-5.5 6.83V20H16v2H8v-2h2.5v-2.17A7 7 0 0 1 5 11V9.87A4 4 0 0 0 8 6V3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M5 5H3v1a4 4 0 0 0 4 4M19 5h2v1a4 4 0 0 1-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

function buildChallengeDescription(metric?: MetricDefinition, targetValue?: string, stars?: number) {
  if (!metric || !targetValue?.trim()) {
    return '';
  }

  return `Alcanza ${formatTargetValue(targetValue, metric)} en ${metric.name.toLowerCase()} para desbloquear un desafio de ${stars ?? 1} estrella${stars === 1 ? '' : 's'}.`;
}

function renderStars(stars: number) {
  return '★'.repeat(stars);
}

export function AdminChallengesPanel({
  initialChallenges,
  metricDefinitions,
}: {
  initialChallenges: ChallengeTemplate[];
  metricDefinitions: MetricDefinition[];
}) {
  const router = useRouter();
  const [challenges, setChallenges] = useState(initialChallenges);
  const [metricDefinitionId, setMetricDefinitionId] = useState(metricDefinitions[0]?.id ?? '');
  const [targetValue, setTargetValue] = useState('');
  const [difficultyStars, setDifficultyStars] = useState(3);
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMetric = useMemo(
    () => metricDefinitions.find((definition) => definition.id === metricDefinitionId) ?? null,
    [metricDefinitionId, metricDefinitions],
  );

  const generatedTitle = buildChallengeTitle(selectedMetric ?? undefined, targetValue);
  const generatedDescription = description.trim()
    ? description.trim()
    : buildChallengeDescription(selectedMetric ?? undefined, targetValue, difficultyStars);

  function startEdit(challenge: ChallengeTemplate) {
    setEditingId(challenge.id);
    setMetricDefinitionId(challenge.metricDefinition?.id ?? '');
    setTargetValue(challenge.targetValue !== null ? String(challenge.targetValue) : '');
    setDifficultyStars(challenge.difficultyStars);
    setDescription(challenge.description ?? '');
    setIsActive(challenge.isActive);
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setMetricDefinitionId(metricDefinitions[0]?.id ?? '');
    setTargetValue('');
    setDifficultyStars(3);
    setDescription('');
    setIsActive(true);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
        metricDefinitionId,
        targetValue: Number(targetValue),
        difficultyStars,
        isActive,
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

      resetForm();
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'No pudimos guardar el desafio.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="admin-challenges-shell">
      <header className="admin-challenges-header">
        <div>
          <div className="admin-challenges-title-row">
            <span className="admin-challenges-title-icon">
              <TrophyIcon />
            </span>
            <div>
              <h3>Gestion de Desafios</h3>
              <p>Crea logros segun metrica, objetivo y nivel de dificultad.</p>
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

      <article className="admin-challenges-intro-card">
        <p>
          Define desafios medibles para alumnos usando las metricas que ya cargan en resultados:
          facturacion, consultas, seguidores, cierres y mas.
        </p>
      </article>

      <div className="admin-challenges-layout">
        <form className="admin-challenge-form" onSubmit={handleSubmit}>
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
            <span>Descripcion del logro</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Opcional. Si lo dejas vacio, se genera una descripcion automaticamente."
              rows={4}
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
            <strong>{generatedTitle || 'Selecciona una metrica y una meta'}</strong>
            <p>{generatedDescription || 'Todavia no hay descripcion.'}</p>
            <em>{renderStars(difficultyStars)}</em>
          </article>

          {error ? <p className="student-results-form-error">{error}</p> : null}

          <div className="student-results-form-actions">
            {editingId ? (
              <button type="button" className="ghost-button" onClick={resetForm}>
                Cancelar
              </button>
            ) : null}
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear desafio'}
            </button>
          </div>
        </form>

        <div className="admin-challenges-list">
          {challenges.map((challenge) => (
            <article className="admin-challenge-card" key={challenge.id}>
              <div className="admin-challenge-card-top">
                <div>
                  <h4>{challenge.title}</h4>
                  <p>{challenge.description ?? 'Sin descripcion por ahora.'}</p>
                </div>
                <span className={challenge.isActive ? 'student-results-status' : 'admin-challenge-inactive'}>
                  {challenge.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="admin-challenge-card-meta">
                <span>{challenge.metricDefinition?.name ?? 'Sin metrica'}</span>
                <span>
                  Meta:{' '}
                  {challenge.targetValue !== null
                    ? formatTargetValue(challenge.targetValue, challenge.metricDefinition ?? undefined)
                    : '-'}
                </span>
                <span>{renderStars(challenge.difficultyStars)}</span>
              </div>

              <button type="button" className="ghost-button" onClick={() => startEdit(challenge)}>
                Modificar
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
