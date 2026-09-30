"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  feedbackDate,
  feedbackRequest,
  type FeedbackItem,
  type FeedbackList,
} from "@/lib/feedbacks";
import { FeedbackProfileEditor } from "./feedback-profile-editor";
import { FeedbackStars } from "./feedback-stars";
import styles from "./feedback.module.css";

function FeedbackDialog({
  item,
  original,
  onClose,
  onOpenFinal,
}: {
  item: FeedbackItem;
  original: boolean;
  onClose: () => void;
  onOpenFinal: (item: FeedbackItem) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <dialog
      className={styles.dialog}
      ref={dialogRef}
      aria-labelledby="feedback-dialog-title"
      onClose={onClose}
    >
      <div className={styles.dialogHeader}>
        <div>
          <p className={styles.eyebrow}>
            {original ? "RESPUESTA ORIGINAL" : "EXPERIENCIA DE MENTORÍA"}
          </p>
          <h2 id="feedback-dialog-title">
            {item.student.user.firstName} {item.student.user.lastName}
          </h2>
        </div>
        <button
          autoFocus
          className={styles.closeButton}
          type="button"
          aria-label="Cerrar feedback"
          onClick={() => dialogRef.current?.close()}
        >
          ×
        </button>
      </div>
      <div className={styles.metadata}>
        <Link href={`/admin/students/${item.studentId}`}>
          Ver perfil del alumno ↗
        </Link>
      </div>
      <div className={styles.dialogContent}>
        <div className={styles.experienceBlock}>
          <p className={styles.fieldLabel}>Experiencia de la mentoría</p>
          <FeedbackStars value={item.rating} />
        </div>
        <section className={styles.responseBlock}>
          <h3 className={styles.fieldLabel}>Feedback de la mentoría</h3>
          <p className={styles.fullText}>{item.feedback}</p>
        </section>
        <section className={styles.responseBlock}>
          <h3 className={styles.fieldLabel}>Logro de la semana</h3>
          <p className={styles.fullText}>
            {item.achievement || "No compartió un logro esta semana."}
          </p>
        </section>
        {original ? (
          <div className={styles.actions}>
            <Link
              className="primary-button"
              href={`/admin/feedbacks?feedbackId=${encodeURIComponent(item.id)}`}
              onClick={(event) => {
                if (!event.ctrlKey && !event.metaKey) {
                  event.preventDefault();
                  onOpenFinal(item);
                }
              }}
            >
              Ver feedback vinculado →
            </Link>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}

export function AdminFeedbacksPanel({
  studentId,
  initialFeedbackId,
}: {
  studentId?: string;
  initialFeedbackId?: string;
}) {
  const [originals, setOriginals] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    rating: "",
    from: "",
    to: "",
  });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<FeedbackList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(false);
  const [editor, setEditor] = useState<FeedbackItem | null>(null);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<{
    item: FeedbackItem;
    original: boolean;
  } | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  const linkRef = useRef<HTMLInputElement>(null);
  const openRequest = useRef(0);

  const query = new URLSearchParams({
    page: String(page),
    originals: String(originals),
  });
  if (studentId) query.set("studentId", studentId);
  for (const [key, value] of Object.entries(applied))
    if (value) query.set(key, value);
  const queryString = query.toString();

  useEffect(() => {
    const controller = new AbortController();
    feedbackRequest<FeedbackList>(`/api/admin/feedbacks?${queryString}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult(data);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "No pudimos cargar los feedbacks.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [queryString, revision]);

  useEffect(() => {
    if (linkRef.current)
      linkRef.current.value = `${window.location.origin}/feedback`;
  }, []);

  useEffect(() => {
    if (!initialFeedbackId) return;
    const controller = new AbortController();
    feedbackRequest<FeedbackItem>(
      `/api/admin/feedbacks/${encodeURIComponent(initialFeedbackId)}`,
      { signal: controller.signal },
    )
      .then((item) => {
        if (!controller.signal.aborted) setSelected({ item, original: false });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "No pudimos abrir el feedback.",
          );
      });
    return () => controller.abort();
  }, [initialFeedbackId]);

  function reload() {
    setLoading(true);
    setRevision((value) => value + 1);
  }

  async function open(
    item: FeedbackItem,
    showOriginal = originals,
    edit = false,
  ) {
    if (showOriginal) {
      setSelected({ item, original: true });
      return;
    }
    const requestId = ++openRequest.current;
    setOpening(true);
    setError("");
    try {
      const fresh = await feedbackRequest<FeedbackItem>(
        `/api/admin/feedbacks/${item.id}`,
      );
      if (requestId === openRequest.current) {
        if (edit && studentId) {
          setEditor(fresh);
          setNotice("");
        } else {
          setSelected({ item: fresh, original: false });
        }
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos abrir el feedback.",
      );
    } finally {
      if (requestId === openRequest.current) setOpening(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/feedback`);
      setCopyMessage("Enlace copiado.");
    } catch {
      linkRef.current?.select();
      setCopyMessage("Seleccionamos el enlace para que puedas copiarlo.");
    }
  }

  return (
    <section className={styles.panel} aria-label="Feedbacks de mentoría">
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>ESCUCHAR PARA ACOMPAÑAR</p>
          <h2>{studentId ? "Feedbacks del alumno" : "Feedbacks"}</h2>
          <p>
            {originals
              ? "Respuestas tal como las enviaron los alumnos, vinculadas a cada feedback."
              : "Experiencias y logros compartidos después de cada mentoría."}
          </p>
        </div>
      </div>
      {!studentId ? (
        <>
          <div className={styles.shareBox}>
            <label htmlFor="feedback-share-link">
              Enlace para enviar después de la llamada
            </label>
            <div>
              <input
                ref={linkRef}
                id="feedback-share-link"
                readOnly
                defaultValue="/feedback"
              />
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={copyLink}
              >
                Copiar enlace
              </button>
            </div>
            {copyMessage ? <p role="status">{copyMessage}</p> : null}
          </div>
          <nav className={styles.sections} aria-label="Secciones de feedbacks">
            {[
              { value: false, label: "Feedbacks" },
              { value: true, label: "Respuestas originales" },
            ].map((section) => (
              <button
                type="button"
                key={section.label}
                aria-pressed={originals === section.value}
                className={
                  originals === section.value ? styles.sectionActive : ""
                }
                onClick={() => {
                  if (originals !== section.value) {
                    setOriginals(section.value);
                    setPage(1);
                    setLoading(true);
                  }
                }}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </>
      ) : null}
      <form
        className={styles.filters}
        onSubmit={(event) => {
          event.preventDefault();
          if (filters.from && filters.to && filters.from > filters.to) {
            setError("La fecha desde debe ser anterior a la fecha hasta.");
            return;
          }
          setApplied({ ...filters });
          setPage(1);
          reload();
        }}
      >
        {!studentId ? (
          <label>
            Alumno
            <input
              type="search"
              placeholder="Nombre o email"
              maxLength={150}
              value={filters.q}
              onChange={(event) =>
                setFilters({ ...filters, q: event.target.value })
              }
            />
          </label>
        ) : null}
        <label>
          Calificación
          <select
            value={filters.rating}
            onChange={(event) =>
              setFilters({ ...filters, rating: event.target.value })
            }
          >
            <option value="">Todas</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "estrella" : "estrellas"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Enviado desde
          <input
            type="date"
            value={filters.from}
            onChange={(event) =>
              setFilters({ ...filters, from: event.target.value })
            }
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(event) =>
              setFilters({ ...filters, to: event.target.value })
            }
          />
        </label>
        <button type="submit" className={styles.secondaryButton}>
          Filtrar
        </button>
      </form>
      {studentId && editor ? (
        <FeedbackProfileEditor
          key={editor.id}
          item={editor}
          onCancel={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setNotice("Cambios guardados.");
            reload();
          }}
        />
      ) : null}
      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <div className={styles.errorBox}>
          <p role="alert">{error}</p>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={reload}
          >
            Volver a cargar
          </button>
        </div>
      ) : null}
      {loading ? (
        <p className={styles.empty} role="status">
          Cargando feedbacks…
        </p>
      ) : !error && result ? (
        <>
          <p className={styles.resultCount}>
            {result.total} {result.total === 1 ? "respuesta" : "respuestas"}
          </p>
          {result.items.length ? (
            <div className={styles.cards}>
              {result.items.map((item) => (
                <div key={item.id} className={styles.cardShell}>
                  <button
                    type="button"
                    className={styles.card}
                    disabled={opening}
                    onClick={() => void open(item)}
                    aria-label={`Abrir feedback de ${item.student.user.firstName} ${item.student.user.lastName}, ${feedbackDate(item.createdAt)}`}
                  >
                    <span className={styles.cardHeading}>
                      <strong>
                        {item.student.user.firstName}{" "}
                        {item.student.user.lastName}
                      </strong>
                      <span aria-hidden="true">↗</span>
                    </span>
                    <span className={styles.cardMeta}>
                      Semana del {feedbackDate(item.weekStart)}
                    </span>
                    <FeedbackStars value={item.rating} />
                    <span className={styles.fieldLabel}>
                      Feedback de la mentoría
                    </span>
                    <span className={styles.previewText}>{item.feedback}</span>
                    <span className={styles.fieldLabel}>
                      Logro de la semana
                    </span>
                    <span className={styles.previewText}>
                      {item.achievement || "No compartió un logro esta semana."}
                    </span>
                    <span className={styles.cardFooter}>
                      Enviado el {feedbackDate(item.createdAt)}
                      <span>Ver completo →</span>
                    </span>
                  </button>
                  {studentId ? (
                    <div className={styles.cardTools}>
                      <button
                        type="button"
                        className={styles.editLink}
                        disabled={opening || Boolean(editor)}
                        onClick={() => void open(item, false, true)}
                        aria-label={`Editar feedback de la semana del ${feedbackDate(item.weekStart)}, enviado el ${feedbackDate(item.createdAt)}`}
                      >
                        Editar respuesta
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <h3>Todavía no hay respuestas para mostrar</h3>
              <p>
                {studentId
                  ? "Los feedbacks de este alumno aparecerán acá."
                  : "Compartí el enlace con tus alumnos o probá otros filtros."}
              </p>
            </div>
          )}
          {result.total > result.pageSize ? (
            <div className={styles.pagination}>
              <button
                className={styles.secondaryButton}
                type="button"
                disabled={page <= 1}
                onClick={() => {
                  setPage(page - 1);
                  setLoading(true);
                }}
              >
                Anterior
              </button>
              <span>
                Página {page} de {Math.ceil(result.total / result.pageSize)}
              </span>
              <button
                className={styles.secondaryButton}
                type="button"
                disabled={page * result.pageSize >= result.total}
                onClick={() => {
                  setPage(page + 1);
                  setLoading(true);
                }}
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </>
      ) : null}
      {opening ? <p role="status">Abriendo feedback…</p> : null}
      {selected ? (
        <FeedbackDialog
          key={`${selected.item.id}-${selected.original}`}
          item={selected.item}
          original={selected.original}
          onClose={() => setSelected(null)}
          onOpenFinal={(item) => void open(item, false)}
        />
      ) : null}
    </section>
  );
}
