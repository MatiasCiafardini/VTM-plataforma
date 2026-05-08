'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type AchievementItem = {
  id: string;
  completedAt: string;
  month: number;
  year: number;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentInstagramHandle: string | null;
  challengeId: string;
  challengeTitle: string;
  challengeDescription: string | null;
  difficultyStars: number;
  metricName: string;
  targetValue: number;
  currentValue: number;
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

function formatMonthYear(month: number, year: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatValue(value: number) {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function renderStars(stars: number) {
  return '★'.repeat(stars);
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function AdminAchievementsWall({
  achievements,
  totalUnlockedAchievements,
}: {
  achievements: AchievementItem[];
  totalUnlockedAchievements: number;
}) {
  const [viewMode, setViewMode] = useState<'list' | 'carousel'>('list');
  const [studentFilter, setStudentFilter] = useState('ALL');
  const [achievementFilter, setAchievementFilter] = useState('ALL');
  const [selectedAchievementId, setSelectedAchievementId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const studentOptions = useMemo(
    () =>
      Array.from(new Set(achievements.map((achievement) => achievement.studentName))).sort((a, b) =>
        a.localeCompare(b, 'es'),
      ),
    [achievements],
  );

  const achievementOptions = useMemo(
    () =>
      Array.from(new Set(achievements.map((achievement) => achievement.challengeTitle))).sort((a, b) =>
        a.localeCompare(b, 'es'),
      ),
    [achievements],
  );

  const filteredAchievements = useMemo(
    () =>
      achievements.filter((achievement) => {
        const matchesStudent =
          studentFilter === 'ALL' || achievement.studentName === studentFilter;
        const matchesAchievement =
          achievementFilter === 'ALL' || achievement.challengeTitle === achievementFilter;

        return matchesStudent && matchesAchievement;
      }),
    [achievementFilter, achievements, studentFilter],
  );

  const selectedAchievement =
    filteredAchievements.find((achievement) => achievement.id === selectedAchievementId) ??
    achievements.find((achievement) => achievement.id === selectedAchievementId) ??
    null;
  const carouselItems =
    filteredAchievements.length > 1
      ? [...filteredAchievements, ...filteredAchievements]
      : filteredAchievements;

  function getInstagramCopy(achievement: AchievementItem) {
    return achievement.studentInstagramHandle
      ? `@${achievement.studentInstagramHandle.replace(/^@/, '')}`
      : achievement.studentEmail;
  }

  function buildStorySvg(achievement: AchievementItem) {
    const title = escapeSvgText(achievement.challengeTitle);
    const studentName = escapeSvgText(achievement.studentName);
    const description = escapeSvgText(
      achievement.challengeDescription ?? 'Logro completado dentro de la plataforma.',
    );
    const date = escapeSvgText(formatMonthYear(achievement.month, achievement.year));
    const metric = escapeSvgText(achievement.metricName);
    const valueCopy = escapeSvgText(
      `${formatValue(achievement.currentValue)} de ${formatValue(achievement.targetValue)}`,
    );
    const handle = escapeSvgText(getInstagramCopy(achievement));

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0A0A0A"/>
            <stop offset="58%" stop-color="#181716"/>
            <stop offset="100%" stop-color="#2A2309"/>
          </linearGradient>
          <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#FFE070"/>
            <stop offset="100%" stop-color="#FFD102"/>
          </linearGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#bg)"/>
        <circle cx="912" cy="272" r="230" fill="rgba(255,209,2,0.16)"/>
        <circle cx="156" cy="1648" r="260" fill="rgba(255,209,2,0.08)"/>
        <rect x="86" y="112" width="908" height="1696" rx="54" fill="#151515" stroke="rgba(255,209,2,0.28)" stroke-width="2"/>
        <rect x="134" y="176" width="136" height="136" rx="34" fill="url(#gold)"/>
        <text x="202" y="264" text-anchor="middle" fill="#161003" font-size="70" font-family="Arial" font-weight="700">★</text>
        <text x="134" y="406" fill="#FFD102" font-size="34" font-family="Arial" font-weight="700" letter-spacing="6">LOGRO DESBLOQUEADO</text>
        <text x="134" y="530" fill="#FFFFFF" font-size="72" font-family="Arial" font-weight="700">${studentName}</text>
        <text x="134" y="592" fill="#CFC9B7" font-size="38" font-family="Arial">${handle}</text>
        <rect x="134" y="684" width="812" height="2" fill="rgba(255,255,255,0.1)"/>
        <text x="134" y="824" fill="#FFFFFF" font-size="78" font-family="Arial" font-weight="700">${title}</text>
        <text x="134" y="940" fill="#C6C1B5" font-size="38" font-family="Arial">${description}</text>
        <rect x="134" y="1114" width="812" height="214" rx="30" fill="rgba(255,209,2,0.08)" stroke="rgba(255,209,2,0.2)"/>
        <text x="184" y="1202" fill="#FFD102" font-size="30" font-family="Arial" font-weight="700">${metric}</text>
        <text x="184" y="1282" fill="#FFFFFF" font-size="60" font-family="Arial" font-weight="700">${valueCopy}</text>
        <text x="134" y="1482" fill="#FFD102" font-size="42" font-family="Arial" font-weight="700">${escapeSvgText(renderStars(achievement.difficultyStars))}</text>
        <text x="134" y="1572" fill="#9A999A" font-size="34" font-family="Arial">Completado en ${date}</text>
        <text x="134" y="1708" fill="#FFFFFF" font-size="34" font-family="Arial" font-weight="700">Mentoria VMT</text>
      </svg>
    `.trim();
  }

  async function shareAchievementStory(achievement: AchievementItem) {
    setIsSharing(true);

    try {
      const svgBlob = new Blob([buildStorySvg(achievement)], {
        type: 'image/svg+xml;charset=utf-8',
      });
      const svgUrl = URL.createObjectURL(svgBlob);
      const image = new Image();

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('No pudimos preparar la historia.'));
        image.src = svgUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('No pudimos preparar la historia.');
      }

      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(svgUrl);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png', 1),
      );

      if (!blob) {
        throw new Error('No pudimos exportar la historia.');
      }

      const file = new File(
        [blob],
        `logro-${slugify(achievement.studentName)}-${slugify(achievement.challengeTitle)}.png`,
        { type: 'image/png' },
      );

      if (
        typeof navigator !== 'undefined' &&
        'share' in navigator &&
        'canShare' in navigator &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: achievement.challengeTitle,
          text: 'Historia lista para compartir en Instagram.',
        });
        return;
      }

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } finally {
      setIsSharing(false);
    }
  }

  function renderAchievementCard(
    achievement: AchievementItem,
    options?: { carousel?: boolean; instanceKey?: string },
  ) {
    return (
      <button
        type="button"
        className={
          options?.carousel
            ? 'admin-achievement-card admin-achievement-card-button admin-achievement-carousel-card'
            : 'admin-achievement-card admin-achievement-card-button'
        }
        key={options?.instanceKey ?? achievement.id}
        onClick={() => setSelectedAchievementId(achievement.id)}
      >
        <div className="admin-achievement-card-top">
          <div>
            <p className="admin-achievement-student">{achievement.studentName}</p>
            <h4>{achievement.challengeTitle}</h4>
            <p className="admin-achievement-description">
              {achievement.challengeDescription ?? 'Logro completado dentro de la plataforma.'}
            </p>
          </div>
          <span className="student-results-status">
            {formatMonthYear(achievement.month, achievement.year)}
          </span>
        </div>

        <div className="admin-achievement-meta">
          <span>{getInstagramCopy(achievement)}</span>
          <span>{achievement.metricName}</span>
          <span>
            Meta {formatValue(achievement.targetValue)} / Logrado{' '}
            {formatValue(achievement.currentValue)}
          </span>
          <span className="admin-achievement-stars">
            {renderStars(achievement.difficultyStars)}
          </span>
        </div>
      </button>
    );
  }

  return (
    <>
      <section className="admin-achievements-shell">
        <header className="admin-achievements-header">
          <div className="admin-achievements-title-row">
            <span className="admin-achievements-title-icon">
              <TrophyIcon />
            </span>
            <div>
              <h3>Muro de Logros</h3>
              <p>Logros completados por los alumnos, listos para contenido e historias.</p>
            </div>
          </div>

          <div className="admin-achievements-header-actions">
            <div className="admin-achievements-view-toggle" aria-label="Cambiar vista de logros">
              <button
                type="button"
                className={viewMode === 'list' ? 'is-active' : ''}
                onClick={() => setViewMode('list')}
              >
                Lista
              </button>
              <button
                type="button"
                className={viewMode === 'carousel' ? 'is-active' : ''}
                onClick={() => setViewMode('carousel')}
              >
                Carrusel
              </button>
            </div>

            <Link
              className="primary-button"
              href="/admin?tab=challenges&view=manage"
              prefetch
              scroll={false}
            >
              Gestionar desafios
            </Link>
          </div>
        </header>

        <article className="admin-challenges-intro-card">
          <p>
            Los alumnos ya desbloquearon <strong>{totalUnlockedAchievements}</strong>{' '}
            logros en total dentro de la plataforma.
          </p>
        </article>

        {achievements.length > 0 ? (
          <div className="admin-achievements-controls">
            <label>
              <span>Alumno</span>
              <select value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}>
                <option value="ALL">Todos los alumnos</option>
                {studentOptions.map((student) => (
                  <option key={student} value={student}>
                    {student}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Logro</span>
              <select
                value={achievementFilter}
                onChange={(event) => setAchievementFilter(event.target.value)}
              >
                <option value="ALL">Todos los logros</option>
                {achievementOptions.map((achievement) => (
                  <option key={achievement} value={achievement}>
                    {achievement}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Mostrando {filteredAchievements.length} de {achievements.length}
            </p>
          </div>
        ) : null}

        {achievements.length === 0 ? (
          <article className="admin-achievement-card admin-achievement-card-empty">
            <p>Todavia no hay logros completados para mostrar en el muro.</p>
          </article>
        ) : filteredAchievements.length === 0 ? (
          <article className="admin-achievement-card admin-achievement-card-empty">
            <p>No hay logros que coincidan con los filtros actuales.</p>
          </article>
        ) : viewMode === 'carousel' ? (
          <div className="admin-achievements-carousel-shell">
            <div className="admin-achievements-carousel-track">
              {carouselItems.map((achievement, index) => (
                <div className="admin-achievements-carousel-item" key={`${achievement.id}-${index}`}>
                  {renderAchievementCard(achievement, {
                    carousel: true,
                    instanceKey: `${achievement.id}-${index}`,
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="admin-achievements-list">
            {filteredAchievements.map((achievement) => renderAchievementCard(achievement))}
          </div>
        )}
      </section>

      {selectedAchievement ? (
        <div
          className="student-challenge-modal-backdrop"
          onClick={() => setSelectedAchievementId(null)}
        >
          <div
            className="student-challenge-modal admin-achievement-story-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="student-challenge-flyer admin-achievement-story-preview">
              <div className="student-challenge-flyer-mark">
                <TrophyIcon />
              </div>
              <span className="student-challenge-flyer-kicker">Logro desbloqueado</span>
              <h4>{selectedAchievement.studentName}</h4>
              <p className="admin-achievement-story-handle">
                {getInstagramCopy(selectedAchievement)}
              </p>
              <div className="student-challenge-flyer-progress">
                <strong>{selectedAchievement.challengeTitle}</strong>
                <span>
                  {selectedAchievement.challengeDescription ??
                    'Logro completado dentro de la plataforma.'}
                </span>
                <div className="admin-achievement-story-stats">
                  <span>{selectedAchievement.metricName}</span>
                  <strong>
                    {formatValue(selectedAchievement.currentValue)} /{' '}
                    {formatValue(selectedAchievement.targetValue)}
                  </strong>
                </div>
              </div>
              <div className="student-challenge-flyer-footer">
                <span>{formatMonthYear(selectedAchievement.month, selectedAchievement.year)}</span>
              </div>
            </div>

            <div className="student-challenge-modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => shareAchievementStory(selectedAchievement)}
                disabled={isSharing}
              >
                {isSharing ? 'Preparando historia...' : 'Compartir historia de Instagram'}
              </button>
              <p>
                Si el navegador no permite compartir directo, se descargara la imagen lista
                para subir.
              </p>
            </div>

            <button
              type="button"
              className="student-challenge-modal-close"
              onClick={() => setSelectedAchievementId(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
