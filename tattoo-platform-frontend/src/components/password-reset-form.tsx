"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";

type ResetPayload = {
  role: "ADMIN" | "MENTOR" | "STUDENT";
  nextPath: string;
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

export function ForgotPasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    startTransition(async () => {
      const response = await fetch("/api/session/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "No pudimos enviar el codigo.");
        return;
      }

      setMessage(payload.message ?? "Te enviamos un codigo de recuperacion.");
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    });
  }

  return (
    <form className="login-card login-card-compact login-card-reference" onSubmit={handleSubmit}>
      <div className="login-card-head">
        <h1>Recuperar contrasena</h1>
      </div>

      <p className="register-help-text">
        Ingresa tu email y te enviaremos un codigo para crear una nueva contrasena.
      </p>

      <label className="field login-field-simple">
        <span>Email</span>
        <input name="email" type="email" placeholder="tu@email.com" required />
      </label>

      {message ? <p className="hint-box">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <button className="primary-button" type="submit" disabled={isPending}>
        {isPending ? "Enviando..." : "Enviar codigo"}
      </button>

      <p className="login-footer-copy login-footer-copy-reference">
        <Link href="/login">Volver al inicio de sesion</Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get("email") ?? "", [searchParams]);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/session/password-reset/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "El codigo no es valido o ya vencio.");
        return;
      }

      setIsCodeVerified(true);
    });
  }

  function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/session/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const payload = (await response.json()) as ResetPayload | { message?: string };

      if (!response.ok) {
        setError("message" in payload ? payload.message ?? "No pudimos actualizar la contrasena." : "No pudimos actualizar la contrasena.");
        return;
      }

      if (!("nextPath" in payload)) {
        setError("La respuesta de autenticacion no fue valida.");
        return;
      }

      router.replace(`${payload.nextPath}?passwordUpdated=1`);
      router.refresh();
    });
  }

  if (!isCodeVerified) {
    return (
      <form className="login-card login-card-compact login-card-reference" onSubmit={verifyCode}>
        <div className="login-card-head">
          <h1>Codigo de recuperacion</h1>
        </div>

        <label className="field login-field-simple">
          <span>Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        </label>

        <label className="field login-field-simple">
          <span>Codigo</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            pattern="[0-9]{6}"
            placeholder="123456"
            required
          />
        </label>

        {error ? <p className="error-text">{error}</p> : null}

        <button className="primary-button" type="submit" disabled={isPending || code.length !== 6}>
          {isPending ? "Verificando..." : "Verificar codigo"}
        </button>

        <p className="login-footer-copy login-footer-copy-reference">
          <Link href="/forgot-password">Pedir otro codigo</Link>
        </p>
      </form>
    );
  }

  return (
    <form className="login-card login-card-compact login-card-reference" onSubmit={resetPassword}>
      <div className="login-card-head">
        <h1>Nueva contrasena</h1>
      </div>

      <label className="field login-field-simple">
        <span>Nueva contrasena</span>
        <div className="password-field">
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type={showPassword ? "text" : "password"}
            placeholder="Minimo 8 caracteres"
            required
            minLength={8}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
            aria-pressed={showPassword}
          >
            <EyeIcon crossed={showPassword} />
          </button>
        </div>
      </label>

      <label className="field login-field-simple">
        <span>Repetir contrasena</span>
        <div className="password-field">
          <input
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Repite tu contrasena"
            required
            minLength={8}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowConfirmPassword((current) => !current)}
            aria-label={showConfirmPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
            aria-pressed={showConfirmPassword}
          >
            <EyeIcon crossed={showConfirmPassword} />
          </button>
        </div>
      </label>

      {error ? <p className="error-text">{error}</p> : null}

      <button className="primary-button" type="submit" disabled={isPending}>
        {isPending ? "Actualizando..." : "Actualizar contrasena"}
      </button>
    </form>
  );
}
