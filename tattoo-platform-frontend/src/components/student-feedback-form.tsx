"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { feedbackRequest } from "@/lib/feedbacks";
import { FeedbackStars } from "./feedback-stars";
import styles from "./feedback.module.css";

type Draft = {
  rating: number;
  feedback: string;
  achievement: string;
  submissionId: string;
};
const titles = [
  "¿Cómo fue tu experiencia con la mentoría esta semana?",
  "Contanos un poco más sobre tu experiencia",
  "¿Qué logro te gustaría contarnos de esta semana?",
];

export function StudentFeedbackForm({
  userId,
  firstName,
  preview = false,
}: {
  userId: string;
  firstName: string;
  preview?: boolean;
}) {
  const storageKey = `vmt-feedback:${userId}`;
  const [draft, setDraft] = useState<Draft>({
    rating: 0,
    feedback: "",
    achievement: "",
    submissionId: "",
  });
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [nextStep, setNextStep] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      let initial: Draft = {
        rating: 0,
        feedback: "",
        achievement: "",
        submissionId: crypto.randomUUID(),
      };
      try {
        const saved = preview ? null : JSON.parse(
          sessionStorage.getItem(storageKey) || "null",
        ) as Partial<Draft> | null;
        if (
          saved &&
          Number.isInteger(saved.rating) &&
          Number(saved.rating) >= 0 &&
          Number(saved.rating) <= 5 &&
          typeof saved.feedback === "string" &&
          typeof saved.achievement === "string" &&
          typeof saved.submissionId === "string" &&
          /^[0-9a-f-]{36}$/i.test(saved.submissionId)
        ) {
          initial = saved as Draft;
        }
      } catch {
        /* The form also works when browser storage is unavailable. */
      }
      setDraft(initial);
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey, preview]);

  useEffect(() => {
    if (ready && !sent && !preview) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(draft));
      } catch {
        /* Optional draft recovery. */
      }
    }
  }, [draft, ready, sent, storageKey, preview]);

  useEffect(() => {
    if (nextStep === null) return;
    const timer = setTimeout(() => {
      setStep(nextStep);
      setNextStep(null);
    }, 160);
    return () => clearTimeout(timer);
  }, [nextStep]);

  useEffect(() => {
    titleRef.current?.focus();
  }, [step, sent]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  function goTo(value: number) {
    setError("");
    setNextStep(value);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || lock.current || nextStep !== null) return;
    if (step === 1) {
      if (!draft.feedback.trim()) {
        setError("Contanos tu experiencia antes de continuar.");
        return;
      }
      goTo(2);
      return;
    }
    if (step !== 2 || !draft.rating || !draft.feedback.trim()) return;
    lock.current = true;
    setPending(true);
    setError("");
    try {
      if (!preview) {
        await feedbackRequest("/api/feedbacks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          /* Optional draft recovery. */
        }
      }
      setSent(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos enviar tu respuesta. Intentá nuevamente.",
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  if (sent)
    return (
      <section className={`${styles.wizard} ${styles.success}`}>
        <div className={styles.successIcon} aria-hidden="true">
          ✓
        </div>
        <p className={styles.eyebrow}>{preview ? "VISTA PREVIA" : "TU SEMANA CUENTA"}</p>
        <h1 ref={titleRef} tabIndex={-1}>
          {preview ? "Vista previa completada" : "¡Gracias por compartir tu semana!"}
        </h1>
        <p>
          {preview
            ? "Así termina el recorrido para un alumno. Esta prueba no se guardó como respuesta."
            : "Tu experiencia nos ayuda a mejorar la mentoría y acompañarte mejor. Cada avance cuenta."}
        </p>
        <Link className="primary-button" href={preview ? "/admin/feedbacks" : "/student"}>
          {preview ? "Ir a Feedbacks" : "Volver a mi panel"}
        </Link>
      </section>
    );

  return (
    <form className={styles.wizard} onSubmit={submit} aria-busy={pending}>
      <div className={styles.wizardMeta}>
        <span className={styles.eyebrow}>{preview ? "VISTA PREVIA · ADMIN" : "TU SEMANA EN VMT"}</span>
        <span>Paso {step + 1} de 3</span>
      </div>
      {preview ? <p className={styles.previewNote}>Podés recorrer los tres pasos. Esta prueba no se guarda ni aparece en Feedbacks.</p> : null}
      <div className={styles.progress} aria-hidden="true">
        {[0, 1, 2].map((n) => (
          <span key={n} className={n <= step ? styles.progressActive : ""} />
        ))}
      </div>
      <fieldset
        key={step}
        disabled={!ready || pending || nextStep !== null}
        className={`${styles.step} ${nextStep !== null ? styles.leaving : ""}`}
      >
        <p className={styles.greeting}>
          {step === 0
            ? `Hola, ${firstName}. Nos gustaría escucharte.`
            : step === 1
              ? "Tu opinión nos ayuda a crecer."
              : "Los pequeños avances también cuentan."}
        </p>
        <h1 ref={titleRef} tabIndex={-1} id="feedback-question">
          {titles[step]}
        </h1>
        {step === 0 ? (
          <>
            <p>Elegí de 1 a 5 estrellas para continuar.</p>
            <FeedbackStars
              value={draft.rating}
              onChange={(rating) => {
                setDraft({ ...draft, rating });
                goTo(1);
              }}
            />
            <div className={styles.ratingLegend}>
              <span>Podría mejorar</span>
              <span>¡Excelente!</span>
            </div>
          </>
        ) : (
          <>
            <p id="feedback-help">
              {step === 1
                ? "¿Qué te sirvió y qué podríamos mejorar?"
                : "¿Diste un paso que te hace sentir orgullo? Compartilo con nosotros. Este paso es opcional."}
            </p>
            <textarea
              key={step}
              aria-labelledby="feedback-question"
              aria-describedby="feedback-help"
              maxLength={5000}
              required={step === 1}
              rows={4}
              placeholder={
                step === 1
                  ? "Esta semana, la mentoría me ayudó a…"
                  : "Esta semana logré…"
              }
              value={step === 1 ? draft.feedback : draft.achievement}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  [step === 1 ? "feedback" : "achievement"]: event.target.value,
                })
              }
            />
            <span className={styles.counter}>
              {(step === 1 ? draft.feedback : draft.achievement).length} / 5000
            </span>
            <div className={styles.actions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => goTo(step - 1)}
              >
                ← Atrás
              </button>
              <button className="primary-button" type="submit">
                {pending ? "Enviando…" : step === 1 ? "Siguiente →" : preview ? "Terminar vista previa" : "Enviar"}
              </button>
            </div>
          </>
        )}
      </fieldset>
      {error ? (
        <p className="error-text" ref={errorRef} role="alert" tabIndex={-1}>
          {error}{" "}
          {error.includes("sesión") ? (
            <Link href="/login?next=/feedback">Iniciar sesión</Link>
          ) : null}
        </p>
      ) : null}
      <p className={styles.privacy}>
        {preview ? "Vista exclusiva para administración. No se guardan respuestas." : "Tu respuesta se comparte con el equipo de VMT."}
      </p>
      <noscript>Activá JavaScript para completar el formulario.</noscript>
    </form>
  );
}
