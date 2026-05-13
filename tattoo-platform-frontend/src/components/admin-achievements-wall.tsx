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

type AchievementExportFormat = 'story-3-4' | 'post-4-3';

const achievementExportFormats: Record<
  AchievementExportFormat,
  { width: number; height: number; label: string; helper: string; fileSuffix: string }
> = {
  'story-3-4': {
    width: 1080,
    height: 1440,
    label: '3:4',
    helper: 'Historia vertical',
    fileSuffix: 'historia-3x4',
  },
  'post-4-3': {
    width: 1440,
    height: 1080,
    label: '4:3',
    helper: 'Publicacion horizontal',
    fileSuffix: 'publicacion-4x3',
  },
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

function wrapSvgText(value: string, maxChars: number, maxLines: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }

    currentLine = nextLine;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines && visibleLines.length > 0) {
    visibleLines[visibleLines.length - 1] = `${visibleLines[visibleLines.length - 1].replace(/[.,;:!?]+$/, '')}...`;
  }

  return visibleLines;
}

function renderSvgTextLines(
  lines: string[],
  options: {
    x: number;
    y: number;
    lineHeight: number;
    fill: string;
    fontSize: number;
    fontWeight?: number;
  },
) {
  return lines
    .map(
      (line, index) =>
        `<text x="${options.x}" y="${options.y + index * options.lineHeight}" fill="${options.fill}" font-size="${options.fontSize}" font-family="Arial" font-weight="${options.fontWeight ?? 400}">${escapeSvgText(line)}</text>`,
    )
    .join('');
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
  const [showFormatPicker, setShowFormatPicker] = useState(false);
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

  function buildAchievementSvg(
    achievement: AchievementItem,
    format: AchievementExportFormat,
  ) {
    const config = achievementExportFormats[format];
    const studentName = escapeSvgText(achievement.studentName);
    const description =
      achievement.challengeDescription ?? 'Logro completado dentro de la plataforma.';
    const date = escapeSvgText(formatMonthYear(achievement.month, achievement.year));
    const metric = escapeSvgText(achievement.metricName);
    const valueCopy = escapeSvgText(
      `${formatValue(achievement.currentValue)} de ${formatValue(achievement.targetValue)}`,
    );
    const handle = escapeSvgText(getInstagramCopy(achievement));

    if (format === 'post-4-3') {
      const titleLines = renderSvgTextLines(wrapSvgText(achievement.challengeTitle, 22, 3), {
        x: 640,
        y: 326,
        lineHeight: 78,
        fill: '#FFFFFF',
        fontSize: 68,
        fontWeight: 700,
      });
      const descriptionLines = renderSvgTextLines(wrapSvgText(description, 42, 3), {
        x: 640,
        y: 590,
        lineHeight: 44,
        fill: '#C6C1B5',
        fontSize: 34,
      });

      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${config.width}" height="${config.height}" viewBox="0 0 ${config.width} ${config.height}">
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#080808"/>
              <stop offset="55%" stop-color="#181716"/>
              <stop offset="100%" stop-color="#2A2309"/>
            </linearGradient>
            <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#FFE070"/>
              <stop offset="100%" stop-color="#FFD102"/>
            </linearGradient>
          </defs>
          <rect width="${config.width}" height="${config.height}" fill="url(#bg)"/>
          <circle cx="1210" cy="168" r="250" fill="rgba(255,209,2,0.16)"/>
          <circle cx="160" cy="920" r="300" fill="rgba(255,209,2,0.08)"/>
          <rect x="72" y="72" width="1296" height="936" rx="48" fill="#151515" stroke="rgba(255,209,2,0.28)" stroke-width="2"/>
          <rect x="132" y="138" width="420" height="804" rx="38" fill="rgba(255,209,2,0.08)" stroke="rgba(255,209,2,0.18)"/>
          <rect x="188" y="206" width="148" height="148" rx="36" fill="url(#gold)"/>
          <g transform="translate(225 243) scale(3.05)" fill="none" stroke="#161003" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3h8v3a4 4 0 0 0 3 3.87V11a7 7 0 0 1-5.5 6.83V20H16v2H8v-2h2.5v-2.17A7 7 0 0 1 5 11V9.87A4 4 0 0 0 8 6V3Z"/>
            <path d="M5 5H3v1a4 4 0 0 0 4 4M19 5h2v1a4 4 0 0 1-4 4"/>
          </g>
          <text x="188" y="446" fill="#FFD102" font-size="30" font-family="Arial" font-weight="700" letter-spacing="5">LOGRO</text>
          <text x="188" y="538" fill="#FFFFFF" font-size="58" font-family="Arial" font-weight="700">${studentName}</text>
          <text x="188" y="596" fill="#CFC9B7" font-size="34" font-family="Arial">${handle}</text>
          <text x="188" y="812" fill="#9A999A" font-size="30" font-family="Arial">Completado en</text>
          <text x="188" y="862" fill="#FFFFFF" font-size="38" font-family="Arial" font-weight="700">${date}</text>
          <text x="640" y="214" fill="#FFD102" font-size="32" font-family="Arial" font-weight="700" letter-spacing="6">LOGRO DESBLOQUEADO</text>
          ${titleLines}
          ${descriptionLines}
          <rect x="640" y="742" width="620" height="150" rx="28" fill="rgba(255,209,2,0.08)" stroke="rgba(255,209,2,0.2)"/>
          <text x="682" y="806" fill="#FFD102" font-size="28" font-family="Arial" font-weight="700">${metric}</text>
          <text x="682" y="860" fill="#FFFFFF" font-size="48" font-family="Arial" font-weight="700">${valueCopy}</text>
          <text x="640" y="950" fill="#FFFFFF" font-size="32" font-family="Arial" font-weight="700">Mentoria VMT</text>
          <text x="1042" y="950" fill="#FFD102" font-size="38" font-family="Arial" font-weight="700">${escapeSvgText(renderStars(achievement.difficultyStars))}</text>
        </svg>
      `.trim();
    }

    const titleLines = renderSvgTextLines(wrapSvgText(achievement.challengeTitle, 20, 3), {
      x: 134,
      y: 674,
      lineHeight: 78,
      fill: '#FFFFFF',
      fontSize: 70,
      fontWeight: 700,
    });
    const descriptionLines = renderSvgTextLines(wrapSvgText(description, 34, 3), {
      x: 134,
      y: 936,
      lineHeight: 42,
      fill: '#C6C1B5',
      fontSize: 34,
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${config.width}" height="${config.height}" viewBox="0 0 ${config.width} ${config.height}">
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
        <rect width="${config.width}" height="${config.height}" fill="url(#bg)"/>
        <circle cx="912" cy="272" r="230" fill="rgba(255,209,2,0.16)"/>
        <circle cx="156" cy="1220" r="260" fill="rgba(255,209,2,0.08)"/>
        <rect x="86" y="92" width="908" height="1256" rx="54" fill="#151515" stroke="rgba(255,209,2,0.28)" stroke-width="2"/>
        <rect x="134" y="152" width="136" height="136" rx="34" fill="url(#gold)"/>
        <g transform="translate(168 186) scale(2.8)" fill="none" stroke="#161003" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 3h8v3a4 4 0 0 0 3 3.87V11a7 7 0 0 1-5.5 6.83V20H16v2H8v-2h2.5v-2.17A7 7 0 0 1 5 11V9.87A4 4 0 0 0 8 6V3Z"/>
          <path d="M5 5H3v1a4 4 0 0 0 4 4M19 5h2v1a4 4 0 0 1-4 4"/>
        </g>
        <text x="134" y="382" fill="#FFD102" font-size="34" font-family="Arial" font-weight="700" letter-spacing="6">LOGRO DESBLOQUEADO</text>
        <text x="134" y="492" fill="#FFFFFF" font-size="70" font-family="Arial" font-weight="700">${studentName}</text>
        <text x="134" y="554" fill="#CFC9B7" font-size="38" font-family="Arial">${handle}</text>
        <rect x="134" y="618" width="812" height="2" fill="rgba(255,255,255,0.1)"/>
        ${titleLines}
        ${descriptionLines}
        <rect x="134" y="1088" width="812" height="164" rx="30" fill="rgba(255,209,2,0.08)" stroke="rgba(255,209,2,0.2)"/>
        <text x="184" y="1152" fill="#FFD102" font-size="30" font-family="Arial" font-weight="700">${metric}</text>
        <text x="184" y="1214" fill="#FFFFFF" font-size="54" font-family="Arial" font-weight="700">${valueCopy}</text>
        <text x="134" y="1304" fill="#9A999A" font-size="32" font-family="Arial">Completado en ${date}</text>
        <text x="658" y="1304" fill="#FFD102" font-size="40" font-family="Arial" font-weight="700">${escapeSvgText(renderStars(achievement.difficultyStars))}</text>
      </svg>
    `.trim();
  }

  async function shareOrDownloadAchievementImage(
    achievement: AchievementItem,
    format: AchievementExportFormat,
  ) {
    setIsSharing(true);

    try {
      const config = achievementExportFormats[format];
      const svgBlob = new Blob([buildAchievementSvg(achievement, format)], {
        type: 'image/svg+xml;charset=utf-8',
      });
      const svgUrl = URL.createObjectURL(svgBlob);
      const image = new Image();

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('No pudimos preparar la imagen.'));
        image.src = svgUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = config.width;
      canvas.height = config.height;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('No pudimos preparar la imagen.');
      }

      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(svgUrl);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png', 1),
      );

      if (!blob) {
        throw new Error('No pudimos exportar la imagen.');
      }

      const file = new File(
        [blob],
        `logro-${slugify(achievement.studentName)}-${slugify(achievement.challengeTitle)}-${config.fileSuffix}.png`,
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
          text:
            format === 'story-3-4'
              ? 'Historia lista para compartir en Instagram.'
              : 'Publicacion lista para compartir en Instagram.',
        });
        setShowFormatPicker(false);
        return;
      }

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(downloadUrl);
      setShowFormatPicker(false);
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
          onClick={() => {
            setSelectedAchievementId(null);
            setShowFormatPicker(false);
          }}
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
                onClick={() => setShowFormatPicker(true)}
                disabled={isSharing}
              >
                {isSharing ? 'Preparando imagen...' : 'Compartir o descargar'}
              </button>
              <p>
                Elegi el formato. Si el navegador permite compartir, se abre la hoja de envio;
                si no, se descarga la imagen lista para subir.
              </p>
            </div>

            {showFormatPicker ? (
              <div
                className="achievement-format-modal-backdrop"
                onClick={() => setShowFormatPicker(false)}
              >
                <div
                  className="achievement-format-modal"
                  onClick={(event) => event.stopPropagation()}
                >
                  <h4>Elegi el formato</h4>
                  <div className="achievement-format-options">
                    {(
                      Object.entries(achievementExportFormats) as Array<
                        [AchievementExportFormat, (typeof achievementExportFormats)[AchievementExportFormat]]
                      >
                    ).map(([format, config]) => (
                      <button
                        key={format}
                        type="button"
                        className="achievement-format-option"
                        onClick={() => shareOrDownloadAchievementImage(selectedAchievement, format)}
                        disabled={isSharing}
                      >
                        <span>{config.label}</span>
                        <strong>{config.helper}</strong>
                        <small>
                          {config.width} x {config.height}px
                        </small>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="achievement-format-cancel"
                    onClick={() => setShowFormatPicker(false)}
                    disabled={isSharing}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              className="student-challenge-modal-close"
              onClick={() => {
                setSelectedAchievementId(null);
                setShowFormatPicker(false);
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
