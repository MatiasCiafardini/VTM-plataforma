'use client';

import Link from 'next/link';

type AchievementItem = {
  id: string;
  completedAt: string;
  month: number;
  year: number;
  studentId: string;
  studentName: string;
  studentEmail: string;
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

export function AdminAchievementsWall({
  achievements,
}: {
  achievements: AchievementItem[];
}) {
  return (
    <section className="admin-achievements-shell">
      <header className="admin-achievements-header">
        <div className="admin-achievements-title-row">
          <span className="admin-achievements-title-icon">
            <TrophyIcon />
          </span>
          <div>
            <h3>Muro de Logros</h3>
            <p>Logros completados por los alumnos, ordenados del mas reciente al mas antiguo.</p>
          </div>
        </div>

        <Link
          className="primary-button"
          href="/admin?tab=challenges&view=manage"
          prefetch
          scroll={false}
        >
          Gestionar desafios
        </Link>
      </header>

      {achievements.length === 0 ? (
        <article className="admin-achievement-card admin-achievement-card-empty">
          <p>Todavia no hay logros completados para mostrar en el muro.</p>
        </article>
      ) : (
        <div className="admin-achievements-list">
          {achievements.map((achievement) => (
            <article className="admin-achievement-card" key={achievement.id}>
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
                <span>{achievement.studentEmail}</span>
                <span>{achievement.metricName}</span>
                <span>
                  Meta {formatValue(achievement.targetValue)} / Logrado{' '}
                  {formatValue(achievement.currentValue)}
                </span>
                <span className="admin-achievement-stars">
                  {renderStars(achievement.difficultyStars)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
