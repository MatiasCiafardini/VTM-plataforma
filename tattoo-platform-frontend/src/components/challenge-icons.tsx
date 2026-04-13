import type { ReactNode } from 'react';

export type ChallengeIconKey =
  | 'trophy'
  | 'spark'
  | 'dollar'
  | 'flame'
  | 'rocket'
  | 'ribbon';

export const challengeIconOptions: Array<{
  key: ChallengeIconKey;
  label: string;
}> = [
  { key: 'trophy', label: 'Trofeo' },
  { key: 'spark', label: 'Destello' },
  { key: 'dollar', label: 'Dinero' },
  { key: 'flame', label: 'Fuego' },
  { key: 'rocket', label: 'Cohete' },
  { key: 'ribbon', label: 'Medalla' },
];

export function ChallengeIcon({ iconKey }: { iconKey?: string }): ReactNode {
  switch (iconKey) {
    case 'spark':
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
    case 'dollar':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3v18M16 7.5c0-1.66-1.79-3-4-3s-4 1.34-4 3 1.79 3 4 3 4 1.34 4 3-1.79 3-4 3-4-1.34-4-3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'flame':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12.3 3c1.5 2.2 3.9 3.7 3.9 7a4.2 4.2 0 1 1-8.4 0c0-1.7.9-3.1 2-4.4.6 1.5 1.8 2.6 2.5 3 .4-1.7 0-3.8 0-5.6Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M12 13.5c1.3.8 2 1.8 2 3a2 2 0 1 1-4 0c0-.8.4-1.6 1.1-2.3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'rocket':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M14.5 4.5c2.7-.4 4.5.4 5 1 .6.6 1.4 2.3 1 5l-5.3 5.3-5.7-5.7 5-5.6Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M9.2 10.2 5 11l1.4-4.2M13.8 15.8 13 20l4.2-1.4M15.8 8.2h.01"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'ribbon':
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
    case 'trophy':
    default:
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
}
