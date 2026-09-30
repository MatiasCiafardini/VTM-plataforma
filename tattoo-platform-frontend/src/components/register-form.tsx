"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import {
  countryPhonePrefixes,
  getPhonePrefixForCountry,
  supportedCountries,
} from "@/lib/countries";

type RegisterPayload = {
  role: "ADMIN" | "MENTOR" | "STUDENT";
  nextPath?: string;
};

const subscribeToHydration = () => () => {};

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
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
    }
  }, [error]);

  function handleCountryChange(value: string) {
    setSelectedCountry(value);
    setPhonePrefix(getPhonePrefixForCountry(value) ?? "");
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending || !isHydrated) return;
    setError(null);

    const formData = new FormData(event.currentTarget);
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const country = String(formData.get("country") ?? "").trim();
    const instagramHandle = String(formData.get("instagramHandle") ?? "").trim();
    const phoneCountryCode = String(formData.get("phoneCountryCode") ?? "").trim();
    const phoneNumber = String(formData.get("phoneNumber") ?? "").trim();
    const accessCode = String(formData.get("accessCode") ?? "").trim();
    const birthDate = String(formData.get("birthDate") ?? "").trim();

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    startTransition(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      try {
        const response = await fetch("/api/session/register", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            password,
            country,
            instagramHandle: instagramHandle.replace(/^@/, ""),
            phoneCountryCode,
            phoneNumber,
            accessCode,
            birthDate: birthDate || undefined,
          }),
        });

        const payload: unknown = await response.json();
        if (!payload || typeof payload !== "object") {
          throw new Error("Invalid registration response");
        }

        if (!response.ok) {
          const message =
            "message" in payload
              ? payload.message
              : "No pudimos crear la cuenta.";
          setError(
            typeof message === "string" && message
              ? message
              : "No pudimos crear la cuenta. Intenta nuevamente.",
          );
          return;
        }

        if (
          !("role" in payload) ||
          !["STUDENT", "ADMIN", "MENTOR"].includes(String(payload.role))
        ) {
          setError("La respuesta de autenticacion no fue valida.");
          return;
        }

        const registration = payload as RegisterPayload;
        router.replace(
          registration.role === "STUDENT"
            ? "/student/setup"
            : registration.nextPath ??
                (registration.role === "ADMIN"
                  ? "/admin"
                  : registration.role === "MENTOR"
                    ? "/mentor"
                    : "/student"),
        );
      } catch {
        setError(
          "No pudimos confirmar el registro. Revisa tu conexion e intenta nuevamente. Si ya se creo la cuenta, puedes iniciar sesion con tu email y contraseña.",
        );
      } finally {
        clearTimeout(timeout);
      }
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
        <select
          name="country"
          required
          value={selectedCountry}
          onChange={(event) => handleCountryChange(event.target.value)}
        >
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
        <span>Instagram</span>
        <input
          name="instagramHandle"
          type="text"
          placeholder="@tuusuario"
          required
        />
      </label>

      <div className="register-grid">
        <label className="field login-field-simple">
          <span>Prefijo</span>
          <select
            name="phoneCountryCode"
            required
            value={phonePrefix}
            onChange={(event) => setPhonePrefix(event.target.value)}
          >
            <option value="" disabled>
              Prefijo
            </option>
            {countryPhonePrefixes.map(({ country, prefix }) => (
              <option key={`${country}-${prefix}`} value={prefix}>
                {prefix} {country}
              </option>
            ))}
          </select>
        </label>

        <label className="field login-field-simple">
          <span>Telefono</span>
          <input
            name="phoneNumber"
            type="tel"
            inputMode="numeric"
            pattern="[0-9 ]+"
            placeholder="Numero"
            required
          />
        </label>
      </div>

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
          <span>contraseña</span>
          <div className="password-field">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              minLength={8}
              placeholder="Minimo 8 caracteres"
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

        <label className="field login-field-simple">
          <span>Confirmar contraseña</span>
          <div className="password-field">
            <input
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Repite tu contraseña"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword((current) => !current)}
              aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showConfirmPassword}
            >
              <EyeIcon crossed={showConfirmPassword} />
            </button>
          </div>
        </label>
      </div>

      {error ? (
        <p ref={errorRef} className="error-text" role="alert" tabIndex={-1}>
          {error}
        </p>
      ) : null}
      <noscript>Activa JavaScript y recarga la pagina para crear tu cuenta.</noscript>

      <button
        className="primary-button"
        type="submit"
        disabled={isPending || !isHydrated}
      >
        {!isHydrated
          ? "Cargando formulario..."
          : isPending
            ? "Creando cuenta..."
            : "Crear cuenta"}
      </button>

      <p className="login-footer-copy login-footer-copy-reference">
        Ya tienes cuenta? <Link href="/login">Iniciar sesion</Link>
      </p>
    </form>
  );
}
