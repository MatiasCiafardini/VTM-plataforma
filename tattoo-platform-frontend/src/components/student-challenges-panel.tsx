"use client";

import { ChallengeIcon } from "./challenge-icons";
import { useState } from "react";

type StudentChallengeItem = {
  id: string;
  status: string;
  dueDate: string | null;
  progress: number;
  currentValue: number | null;
  targetValue: number | null;
  achievedAt: string | null;
  challenge: {
    title: string;
    description: string | null;
    iconKey?: string | null;
    rewardTitle?: string | null;
    rewardUrl?: string | null;
    metricSlug?: string | null;
  };
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

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RibbonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="9" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m10 13.5-1 6 3-1.7 3 1.7-1-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getStatusCopy(status: string, progress: number) {
  if (status === "COMPLETED") {
    return "Completado";
  }

  if (status === "IN_PROGRESS") {
    return "En progreso";
  }

  if (status === "EXPIRED") {
    return "Vencido";
  }

  if (status === "CANCELLED") {
    return "Cancelado";
  }

  return progress > 0 ? "En progreso" : "Pendiente";
}

function getEncouragement(progress: number, status: string) {
  if (status === "COMPLETED") {
    return "Contenido desbloqueado y listo para avanzar.";
  }

  if (progress >= 60) {
    return "Segui asi, estas cada vez mas cerca.";
  }

  if (progress > 0) {
    return "Buen ritmo. Este desafio ya esta en marcha.";
  }

  return "Todavia no hay avances registrados en este desafio.";
}

function formatMetricValue(
  value: number | null,
  metricSlug?: string | null,
) {
  if (value === null || Number.isNaN(value)) {
    return "0";
  }

  if (
    metricSlug?.includes("ingresos") ||
    metricSlug?.includes("crecimiento-ingresos")
  ) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (
    metricSlug?.includes("tasa") ||
    metricSlug?.includes("porcentaje")
  ) {
    return `${Math.round(value)}%`;
  }

  const hasDecimals = !Number.isInteger(value);
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: hasDecimals ? 0 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(value);
}

function getExactProgressCopy(challenge: StudentChallengeItem) {
  const current = formatMetricValue(
    challenge.currentValue,
    challenge.challenge.metricSlug,
  );
  const target = formatMetricValue(
    challenge.targetValue,
    challenge.challenge.metricSlug,
  );

  return `${current} / ${target}`;
}

function formatAchievedAt(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getProgressTone(status: string, progress: number) {
  if (status === "COMPLETED") {
    return "student-challenge-card student-challenge-card-completed";
  }

  if (progress > 0) {
    return "student-challenge-card student-challenge-card-progress";
  }

  return "student-challenge-card student-challenge-card-pending";
}

function getIconToneClass(status: string) {
  return status === "COMPLETED"
    ? "student-challenge-icon student-challenge-icon-completed"
    : "student-challenge-icon student-challenge-icon-muted";
}

function getAccentToneClass(status: string) {
  return status === "COMPLETED"
    ? "student-challenge-top-badge student-challenge-top-badge-completed"
    : "student-challenge-top-badge student-challenge-top-badge-muted";
}

function getConfiguredChallengeIcon(iconKey?: string | null) {
  return ChallengeIcon({ iconKey: iconKey ?? "trophy" });
}

function getChallengeAccentIcon(
  challenge: StudentChallengeItem,
  index: number,
) {
  if (challenge.challenge.iconKey) {
    return getConfiguredChallengeIcon(challenge.challenge.iconKey);
  }

  const title = challenge.challenge.title.toLowerCase();

  if (
    title.includes("1,000") ||
    title.includes("3,000") ||
    title.includes("7,000")
  ) {
    return <TrophyIcon />;
  }

  if (title.includes("cierres")) {
    return <RibbonIcon />;
  }

  if (title.includes("consultas")) {
    return <SparkIcon />;
  }

  return index % 2 === 0 ? <TrophyIcon /> : <SparkIcon />;
}

export function StudentChallengesPanel({
  challenges,
}: {
  challenges: StudentChallengeItem[];
}) {
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    null,
  );
  const [isSharing, setIsSharing] = useState(false);
  const normalized = challenges.map((challenge) => {
    const progress = clampProgress(challenge.progress ?? 0);
    return {
      ...challenge,
      progress,
      statusCopy: getStatusCopy(challenge.status, progress),
    };
  });

  const completedCount = normalized.filter(
    (challenge) => challenge.status === "COMPLETED",
  ).length;
  const totalCount = normalized.length;
  const completionRate =
    totalCount > 0
      ? Math.round(
          normalized.reduce((sum, challenge) => sum + challenge.progress, 0) /
            totalCount,
        )
      : 0;
  const selectedChallenge =
    normalized.find((challenge) => challenge.id === selectedChallengeId) ??
    null;

  function buildFlyerSvg(challenge: (typeof normalized)[number]) {
    const title = challenge.challenge.title;
    const subtitle =
      challenge.status === "COMPLETED"
        ? "Felicitaciones por desbloquear este logro."
        : "Vas muy bien. Este desafio ya forma parte de tu progreso.";
    const footer =
      challenge.status === "COMPLETED"
        ? "Mentoria VMT - Logro desbloqueado"
        : "Mentoria VMT - Seguimiento activo";

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#101010"/>
            <stop offset="55%" stop-color="#141414"/>
            <stop offset="100%" stop-color="#1c1607"/>
          </linearGradient>
          <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#FFD102"/>
            <stop offset="100%" stop-color="#FFD102"/>
          </linearGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#bg)"/>
        <circle cx="930" cy="240" r="220" fill="rgba(255,209,2,0.14)"/>
        <circle cx="180" cy="1620" r="240" fill="rgba(255,209,2,0.08)"/>
        <rect x="88" y="116" width="904" height="1688" rx="44" fill="#232223" stroke="rgba(255,209,2,0.28)"/>
        <rect x="136" y="182" width="120" height="120" rx="28" fill="url(#gold)"/>
        <text x="196" y="260" text-anchor="middle" fill="#1a1403" font-size="62" font-family="Arial" font-weight="700">ðŸ†</text>
        <text x="136" y="402" fill="#FFD102" font-size="34" font-family="Arial" font-weight="700" letter-spacing="5">DESAFIO</text>
        <text x="136" y="492" fill="#FFFFFF" font-size="88" font-family="Arial" font-weight="700">${title}</text>
        <text x="136" y="598" fill="#9A999A" font-size="44" font-family="Arial">${subtitle}</text>
        <rect x="136" y="708" width="808" height="2" fill="rgba(255,255,255,0.09)"/>
        <text x="136" y="862" fill="#FFFFFF" font-size="62" font-family="Arial" font-weight="700">${challenge.progress}% completado</text>
        <rect x="136" y="916" width="808" height="24" rx="12" fill="#0A0A0A"/>
        <rect x="136" y="916" width="${Math.max(32, (808 * challenge.progress) / 100)}" height="24" rx="12" fill="url(#gold)"/>
        <text x="136" y="1088" fill="#9A999A" font-size="34" font-family="Arial">Estado actual</text>
        <text x="136" y="1154" fill="#FFFFFF" font-size="64" font-family="Arial" font-weight="700">${challenge.statusCopy}</text>
        <text x="136" y="1310" fill="#FFD102" font-size="42" font-family="Arial">${getEncouragement(challenge.progress, challenge.status)}</text>
        <text x="136" y="1678" fill="#9A999A" font-size="32" font-family="Arial">${footer}</text>
      </svg>
    `.trim();
  }

  async function shareChallengeFlyer(challenge: (typeof normalized)[number]) {
    setIsSharing(true);

    try {
      const svgMarkup = buildFlyerSvg(challenge);
      const svgBlob = new Blob([svgMarkup], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);
      const image = new Image();

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
          reject(new Error("No pudimos preparar el flyer."));
        image.src = svgUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("No pudimos preparar el flyer.");
      }

      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(svgUrl);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 1),
      );

      if (!blob) {
        throw new Error("No pudimos exportar el flyer.");
      }

      const file = new File(
        [blob],
        `desafio-${challenge.challenge.title.toLowerCase().replace(/\s+/g, "-")}.png`,
        {
          type: "image/png",
        },
      );

      if (
        typeof navigator !== "undefined" &&
        "share" in navigator &&
        "canShare" in navigator &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: challenge.challenge.title,
          text: "Comparti este logro en tu historia de Instagram.",
        });
        return;
      }

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <>
      <section className="student-challenges-shell">
        <header className="student-challenges-header">
          <div className="student-challenges-title-row">
            <span className="student-challenges-icon">
              <TrophyIcon />
            </span>
            <div>
              <h3>Desafios</h3>
              <p>Desbloquea logros reales de crecimiento</p>
            </div>
          </div>

          <div className="student-challenges-counter">
            <span>
              <RibbonIcon />
            </span>
            <strong>
              {completedCount} / {totalCount}
            </strong>
          </div>
        </header>

        <article className="student-challenges-quote">
          <span>
            <SparkIcon />
          </span>
          <p>&quot;Segui asi, el progreso es imparable.&quot;</p>
        </article>

        <article className="student-challenges-progress-card">
          <div className="student-challenges-progress-head">
            <strong>Progreso total</strong>
            <span>{completionRate}%</span>
          </div>
          <div className="student-challenges-progress-track">
            <span style={{ width: `${completionRate}%` }} />
          </div>
        </article>

        <div className="student-challenges-grid">
          {normalized.length === 0 ? (
            <article className="student-challenge-card student-challenge-empty">
              <strong>No hay desafios activos por ahora.</strong>
              <p>
                Cuando el administrador cargue desafios para la plataforma, se
                van a ver aca.
              </p>
            </article>
          ) : (
            normalized.map((challenge, index) => (
              <button
                type="button"
                className={getProgressTone(
                  challenge.status,
                  challenge.progress,
                )}
                key={challenge.id}
                onClick={() => setSelectedChallengeId(challenge.id)}
              >
                <div className="student-challenge-card-top">
                  <div className={getIconToneClass(challenge.status)}>
                    {getConfiguredChallengeIcon(challenge.challenge.iconKey)}
                  </div>
                  <span className={getAccentToneClass(challenge.status)}>
                    {getChallengeAccentIcon(challenge, index)}
                  </span>
                </div>

                <div className="student-challenge-copy">
                  <h4>{challenge.challenge.title}</h4>
                  <p>
                    {challenge.challenge.description ??
                      "Alcanza este desafio dentro de la plataforma."}
                  </p>
                </div>

                <div className="student-challenge-status-row">
                  <strong>{challenge.progress}%</strong>
                  <span>{getExactProgressCopy(challenge)}</span>
                </div>

                <div className="student-challenge-track">
                  <span style={{ width: `${challenge.progress}%` }} />
                </div>

                <div className="student-challenge-footer">
                  <strong>
                    {getEncouragement(challenge.progress, challenge.status)}
                  </strong>
                  {challenge.status === "COMPLETED" &&
                  challenge.challenge.rewardTitle ? (
                    <span>
                      Recompensa desbloqueada: {challenge.challenge.rewardTitle}
                    </span>
                  ) : null}
                  {challenge.dueDate ? (
                    <span>
                      Vence{" "}
                      {new Date(challenge.dueDate).toLocaleDateString("es-AR", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  ) : (
                    <span>Seguimiento activo dentro de Mentoria VMT.</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      {selectedChallenge ? (
        <div
          className="student-challenge-modal-backdrop"
          onClick={() => setSelectedChallengeId(null)}
        >
          <div
            className="student-challenge-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="student-challenge-flyer">
              <div className="student-challenge-flyer-mark">
                {getConfiguredChallengeIcon(selectedChallenge.challenge.iconKey)}
              </div>
              <span className="student-challenge-flyer-kicker">
                Logro de Mentoria VMT
              </span>
              <h4>{selectedChallenge.challenge.title}</h4>
              <p>
                {selectedChallenge.status === "COMPLETED"
                  ? "Felicitaciones por este logro. Tu crecimiento ya se nota y este desafio queda desbloqueado."
                  : "Tu progreso viene muy bien. Este desafio ya merece mostrarse como parte de tu camino."}
              </p>

              <div className="student-challenge-flyer-progress">
                <strong>{selectedChallenge.progress}% completado</strong>
                <span>{getExactProgressCopy(selectedChallenge)}</span>
                <div className="student-challenge-flyer-track">
                  <span style={{ width: `${selectedChallenge.progress}%` }} />
                </div>
              </div>

              {selectedChallenge.achievedAt ? (
                <div className="student-challenge-flyer-footer">
                  <span>
                    {selectedChallenge.status === "COMPLETED"
                      ? `Superado el ${formatAchievedAt(selectedChallenge.achievedAt)}`
                      : `Ultimo avance registrado el ${formatAchievedAt(selectedChallenge.achievedAt)}`}
                  </span>
                </div>
              ) : null}

              {selectedChallenge.status !== "COMPLETED" ? (
                <div className="student-challenge-flyer-footer">
                  <span>{selectedChallenge.statusCopy}</span>
                </div>
              ) : null}
            </div>

            {selectedChallenge.status === "COMPLETED" &&
            selectedChallenge.challenge.rewardTitle ? (
              <p className="student-challenge-reward-inline">
                Recompensa desbloqueada: {selectedChallenge.challenge.rewardTitle}
              </p>
            ) : null}

            <div className="student-challenge-modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => shareChallengeFlyer(selectedChallenge)}
                disabled={isSharing}
              >
                {isSharing
                  ? "Preparando flyer..."
                  : "Compartir en historia de Instagram"}
              </button>
              <p>
                Si tu navegador no permite compartir directo, se descargara la
                imagen lista para subir.
              </p>
            </div>

            <button
              type="button"
              className="student-challenge-modal-close"
              onClick={() => setSelectedChallengeId(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}



