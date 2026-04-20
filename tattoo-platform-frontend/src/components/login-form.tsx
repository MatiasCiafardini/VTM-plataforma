"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

type LoginPayload = {
  role: "ADMIN" | "MENTOR" | "STUDENT";
};

function EyeIcon({ crossed = false }: { crossed?: boolean }) {
  if (crossed) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="M10.58 10.58a2 2 0 0 0 2.84 2.84"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M9.88 5.09A10.94 10.94 0 0 1 12 4.91c5.45 0 9.27 4.65 10 5.59a1 1 0 0 1 0 1.22 17.46 17.46 0 0 1-4.24 3.99M6.61 6.61A17.33 17.33 0 0 0 2 10.5a1 1 0 0 0 0 1.22c.82 1.06 5 6.28 10 6.28a10.8 10.8 0 0 0 4.23-.85"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.64-6 10-6 10 6 10 6-3.64 6-10 6-10-6-10-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const showTestCredentials =
    process.env.NEXT_PUBLIC_SHOW_TEST_CREDENTIALS === "true";
  const testAdminEmail = process.env.NEXT_PUBLIC_TEST_ADMIN_EMAIL?.trim();
  const testAdminPassword = process.env.NEXT_PUBLIC_TEST_ADMIN_PASSWORD?.trim();
  const testStudentEmail = process.env.NEXT_PUBLIC_TEST_STUDENT_EMAIL?.trim();
  const testStudentPassword =
    process.env.NEXT_PUBLIC_TEST_STUDENT_PASSWORD?.trim();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      const response = await fetch("/api/session/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json()) as
        | LoginPayload
        | { message?: string };

      if (!response.ok) {
        const message =
          "message" in payload ? payload.message : "No pudimos iniciar sesion.";
        setError(message ?? "No pudimos iniciar sesion.");
        return;
      }

      if (!("role" in payload)) {
        setError("La respuesta de autenticacion no fue valida.");
        return;
      }

      const nextPath =
        payload.role === "ADMIN"
          ? "/admin"
          : payload.role === "MENTOR"
            ? "/mentor"
            : "/student";

      router.replace(nextPath);
      router.refresh();
    });
  };

  return (
    <form
      className="login-card login-card-compact login-card-reference"
      onSubmit={handleSubmit}
    >
      <div className="login-card-head">
        <h1>Iniciar Sesion</h1>
      </div>

      <label className="field login-field-simple">
        <span>Email</span>
        <input name="email" type="email" placeholder="tu@email.com" required />
      </label>

      <label className="field login-field-simple">
        <span>contraseña</span>
        <div className="password-field">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="********"
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
          >
            <EyeIcon crossed={showPassword} />
          </button>
        </div>
      </label>

      {error ? <p className="error-text">{error}</p> : null}

      <button className="primary-button" type="submit" disabled={isPending}>
        {isPending ? "Ingresando..." : "Ingresar"}
      </button>

      <p className="login-footer-copy login-footer-copy-reference">
        No tienes cuenta? <Link href="/register">Registrate</Link>
      </p>

      {showTestCredentials &&
      testAdminEmail &&
      testAdminPassword &&
      testStudentEmail &&
      testStudentPassword ? (
        <div className="hint-box">
          <p>
            Test admin: {testAdminEmail} / {testAdminPassword}
          </p>
          <p>
            Test student: {testStudentEmail} / {testStudentPassword}
          </p>
        </div>
      ) : null}
    </form>
  );
}
