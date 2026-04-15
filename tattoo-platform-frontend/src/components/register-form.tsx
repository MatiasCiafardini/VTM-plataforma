"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { supportedCountries } from "@/lib/countries";

type RegisterPayload = {
  role: "ADMIN" | "MENTOR" | "STUDENT";
  nextPath?: string;
};

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
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

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
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
          <span>contraseña</span>
          <input
            name="password"
            type="password"
            placeholder="Minimo 8 caracteres"
            required
          />
        </label>

        <label className="field login-field-simple">
          <span>Confirmar contraseña</span>
          <input
            name="confirmPassword"
            type="password"
            placeholder="Repite tu contraseña"
            required
          />
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
