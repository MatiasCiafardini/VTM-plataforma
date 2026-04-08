'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function LogoutButton({
  iconOnly = false,
}: {
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await fetch('/api/session/logout', {
        method: 'POST',
      });

      router.replace('/login');
      router.refresh();
    });
  };

  return (
    <button
      className={iconOnly ? 'profile-circle' : 'ghost-button'}
      onClick={handleLogout}
      disabled={isPending}
      aria-label="Cerrar sesion"
      title="Cerrar sesion"
      type="button"
    >
      {iconOnly ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3" />
          <path d="M10 12h10" />
          <path d="m17 7 5 5-5 5" />
        </svg>
      ) : isPending ? (
        'Saliendo...'
      ) : (
        'Cerrar sesion'
      )}
    </button>
  );
}
