"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  feedbackDate,
  feedbackRequest,
  type FeedbackItem,
} from "@/lib/feedbacks";
import { FeedbackStars } from "./feedback-stars";
import styles from "./feedback.module.css";

export function FeedbackProfileEditor({
  item,
  onCancel,
  onSaved,
}: {
  item: FeedbackItem;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(item);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    if (!draft.feedback.trim()) {
      setError("Escribí el feedback antes de guardar.");
      return;
    }
    saving.current = true;
    setPending(true);
    setError("");
    try {
      await feedbackRequest<FeedbackItem>(`/api/admin/feedbacks/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: draft.rating,
          feedback: draft.feedback,
          achievement: draft.achievement,
          version: item.version,
        }),
      });
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos guardar los cambios.",
      );
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  return (
    <section
      className={styles.profileEditor}
      aria-labelledby="feedback-editor-title"
    >
      <p className={styles.eyebrow}>GESTIÓN DEL ALUMNO</p>
      <h3 id="feedback-editor-title" ref={headingRef} tabIndex={-1}>
        Editar feedback
      </h3>
      <p className={styles.cardMeta}>
        Semana del {feedbackDate(item.weekStart)} · Enviado el{" "}
        {feedbackDate(item.createdAt)}
      </p>
      <form onSubmit={save} aria-busy={pending}>
        <fieldset className={styles.dialogContent} disabled={pending}>
          <p className={styles.fieldLabel}>Experiencia de la mentoría</p>
          <FeedbackStars
            value={draft.rating}
            onChange={(rating) => setDraft({ ...draft, rating })}
          />
          <label className={styles.fieldLabel} htmlFor="edit-feedback">
            Feedback de la mentoría
          </label>
          <textarea
            id="edit-feedback"
            rows={5}
            required
            maxLength={5000}
            value={draft.feedback}
            onChange={(event) =>
              setDraft({ ...draft, feedback: event.target.value })
            }
          />
          <label className={styles.fieldLabel} htmlFor="edit-achievement">
            Logro de la semana
          </label>
          <textarea
            id="edit-achievement"
            rows={4}
            maxLength={5000}
            value={draft.achievement}
            onChange={(event) =>
              setDraft({ ...draft, achievement: event.target.value })
            }
          />
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onCancel}
            >
              Cancelar
            </button>
            <button type="submit" className="primary-button">
              {pending ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </fieldset>
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
