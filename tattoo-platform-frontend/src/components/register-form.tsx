"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { supportedCountries } from "@/lib/countries";

type RegisterPayload = {
  role: "ADMIN" | "MENTOR" | "STUDENT";
  nextPath?: string;
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

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const country = String(formData.get("country") ?? "").trim();
    const accessCode = String(formData.get("accessCode") ?? "").trim();
    const birthDate = String(formData.get("birthDate") ?? "").trim();

    if (password !== confirmPassword) {
      setError("Las contraseÃ±as no coinciden.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/session/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          country,
          accessCode,
          birthDate: birthDate || undefined,
        }),
      });

      const payload = (await response.json()) as
        | RegisterPayload
        | { message?: string };

      if (!response.ok) {
        const message =
          "message" in payload
            ? payload.message
            : "No pudimos crear la cuenta.";
        setError(message ?? "No pudimos crear la cuenta.");
        return;
      }

      if (!("role" in payload)) {
        setError("La respuesta de autenticacion no fue valida.");
        return;
      }

      router.replace(
        payload.role === "STUDENT"
          ? "/student/setup"
          : payload.nextPath ??
              (payload.role === "ADMIN"
                ? "/admin"
                : payload.role === "MENTOR"
                  ? "/mentor"
                  : "/student"),
      );
    });
  };

  return (
    <form
      className="login-card login-card-compact login-card-reference"
      onSubmit={handleSubmit}
    >
      <div className="login-card-head">
        <h1>Registrate</h1>
      </div>

      <p className="register-help-text">
        Ingresa el codigo entregado por los administradores para crear tu
        cuenta.
      </p>

      <div className="register-grid">
        <label className="field login-field-simple">
          <span>Nombre</span>
          <input
            name="firstName"
            type="text"
            placeholder="Tu nombre"
            required
          />
        </label>

        <label className="field login-field-simple">
          <span>Apellido</span>
          <input
            name="lastName"
            type="text"
            placeholder="Tu apellido"
            required
          />
        </label>
      </div>

      <label className="field login-field-simple">
        <span>Email</span>
        <input name="email" type="email" placeholder="tu@email.com" required />
      </label>

      <label className="field login-field-simple">
        <span>Pais</span>
        <select name="country" required defaultValue="">
          <option value="" disabled>
            Selecciona tu pais
          </option>
          {supportedCountries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </label>

      <label className="field login-field-simple">
        <span>Fecha de nacimiento</span>
        <input name="birthDate" type="date" required />
      </label>

      <label className="field login-field-simple">
        <span>Codigo</span>
        <input
          name="accessCode"
          type="text"
          placeholder="Codigo de registro"
          required
        />
      </label>

      <div className="register-grid">
        <label className="field login-field-simple">
          <span>contraseÃ±a</span>
          <div className="password-field">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Minimo 8 caracteres"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Ocultar contraseÃ±a" : "Mostrar contraseÃ±a"}
              aria-pressed={showPassword}
            >
              <EyeIcon crossed={showPassword} />
            </button>
          </div>
        </label>

        <label className="field login-field-simple">
          <span>Confirmar contraseÃ±a</span>
          <div className="password-field">
            <input
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Repite tu contraseÃ±a"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword((current) => !current)}
              aria-label={showConfirmPassword ? "Ocultar contraseÃ±a" : "Mostrar contraseÃ±a"}
              aria-pressed={showConfirmPassword}
            >
              <EyeIcon crossed={showConfirmPassword} />
            </button>
          </div>
        </label>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <button className="primary-button" type="submit" disabled={isPending}>
        {isPending ? "Creando cuenta..." : "Crear cuenta"}
      </button>

      <p className="login-footer-copy login-footer-copy-reference">
        Ya tienes cuenta? <Link href="/login">Iniciar sesion</Link>
      </p>
    </form>
  );
}
