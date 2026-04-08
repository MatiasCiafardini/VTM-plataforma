type Tone = 'neutral' | 'green' | 'yellow' | 'red';

export function getToneFromLevel(level: string | null): Tone {
  if (level === 'RED') {
    return 'red';
  }

  if (level === 'YELLOW') {
    return 'yellow';
  }

  if (level === 'GREEN') {
    return 'green';
  }

  return 'neutral';
}

export function getStatusClass(level: string | null) {
  const tone = getToneFromLevel(level);

  if (tone === 'red') return 'status-chip status-red';
  if (tone === 'yellow') return 'status-chip status-yellow';
  if (tone === 'green') return 'status-chip status-green';
  return 'status-chip status-neutral';
}

export function formatCompactNumber(value: number | null) {
  if (value === null) {
    return '-';
  }

  return new Intl.NumberFormat('es-AR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
