'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState, useTransition } from 'react';

type LoginPayload = {
  role: 'ADMIN' | 'MENTOR' | 'STUDENT';
};

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    startTransition(async () => {
      const response = await fetch('/api/session/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json()) as LoginPayload | { message?: string };

      if (!response.ok) {
        const message =
          'message' in payload ? payload.message : 'No pudimos iniciar sesion.';
        setError(message ?? 'No pudimos iniciar sesion.');
        return;
      }

      if (!('role' in payload)) {
        setError('La respuesta de autenticacion no fue valida.');
        return;
      }

      const nextPath =
        payload.role === 'ADMIN'
          ? '/admin'
          : payload.role === 'MENTOR'
            ? '/mentor'
            : '/student';

      router.replace(nextPath);
      router.refresh();
    });
  };

  return (
    <form className="login-card login-card-compact" onSubmit={handleSubmit}>
      <div className="login-card-head">
        <h1>Iniciar Sesion</h1>
      </div>

      <label className="field">
        <span>Email</span>
        <input name="email" type="email" placeholder="tu@email.com" required />
      </label>

      <label className="field">
        <span>Contrasena</span>
        <input name="password" type="password" placeholder="********" required />
      </label>

      {error ? <p className="error-text">{error}</p> : null}

      <button className="primary-button" type="submit" disabled={isPending}>
        {isPending ? 'Ingresando...' : 'Ingresar'}
      </button>

      <p className="login-footer-copy">No tienes cuenta? Registrate</p>

      <div className="hint-box">
        <p>Test admin: admin@plataformavtm.com / ChangeMe12345!</p>
        <p>Test student: student@tattoo-platform.local / Student12345!</p>
      </div>
    </form>
  );
}
