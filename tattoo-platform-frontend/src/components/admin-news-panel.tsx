'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export type NewsItem = {
  id: string;
  title: string;
  body: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

type NewsFormState = {
  id: string | null;
  title: string;
  body: string;
  isPublished: boolean;
  notifyStudents: boolean;
};

function getInitialFormState(): NewsFormState {
  return {
    id: null,
    title: '',
    body: '',
    isPublished: true,
    notifyStudents: true,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function AdminNewsPanel({ initialNews }: { initialNews: NewsItem[] }) {
  const router = useRouter();
  const [news, setNews] = useState(initialNews);
  const [form, setForm] = useState<NewsFormState>(getInitialFormState());
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof NewsFormState>(key: K, value: NewsFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(getInitialFormState());
    setMessage(null);
    setError(null);
  }

  function startEdit(item: NewsItem) {
    setForm({
      id: item.id,
      title: item.title,
      body: item.body,
      isPublished: item.isPublished,
      notifyStudents: false,
    });
    setMessage(null);
    setError(null);
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.body.trim()) {
      setError('El título y el contenido son obligatorios.');
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        isPublished: form.isPublished,
        notifyStudents: form.id ? undefined : form.notifyStudents,
      };

      const response = await fetch(
        form.id ? `/api/admin/news/${form.id}` : '/api/admin/news',
        {
          method: form.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      const result = (await response.json()) as NewsItem & { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? 'No pudimos guardar la noticia.');
      }

      setNews((current) =>
        form.id
          ? current.map((item) => (item.id === result.id ? result : item))
          : [result, ...current],
      );
      setMessage(form.id ? 'Noticia actualizada.' : 'Noticia publicada.');
      resetForm();
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'No pudimos guardar la noticia.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(newsId: string) {
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/news/${newsId}`, { method: 'DELETE' });
      const result = (await response.json()) as { success?: boolean; message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? 'No pudimos eliminar la noticia.');
      }

      setNews((current) => current.filter((item) => item.id !== newsId));

      if (form.id === newsId) {
        resetForm();
      }

      setMessage('Noticia eliminada.');
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'No pudimos eliminar la noticia.',
      );
    }
  }

  return (
    <div className="admin-settings-section admin-group-meetings-shell">
      <section className="admin-group-meetings-form">
        <div className="admin-settings-grid">
          <label className="admin-group-meetings-field">
            <span>Título</span>
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder="Ej. Nuevas funcionalidades del mes"
            />
          </label>
        </div>

        <div className="admin-settings-grid">
          <label className="admin-group-meetings-description">
            <span>Contenido</span>
            <textarea
              value={form.body}
              onChange={(event) => updateField('body', event.target.value)}
              rows={6}
              placeholder="Escribí el contenido de la novedad..."
            />
          </label>
        </div>

        <div className="admin-settings-toggle-list">
          <label className="admin-settings-toggle-card">
            <div>
              <strong>Publicada</strong>
              <span>Visible para los alumnos en su panel de novedades.</span>
            </div>
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(event) => updateField('isPublished', event.target.checked)}
            />
          </label>

          {!form.id ? (
            <label className="admin-settings-toggle-card">
              <div>
                <strong>Notificar a los alumnos</strong>
                <span>Envia una notificacion a todos los alumnos activos al publicar.</span>
              </div>
              <input
                type="checkbox"
                checked={form.notifyStudents}
                onChange={(event) => updateField('notifyStudents', event.target.checked)}
              />
            </label>
          ) : null}
        </div>

        {message ? <p className="student-results-form-success">{message}</p> : null}
        {error ? <p className="student-results-form-error">{error}</p> : null}

        <div className="student-results-form-actions">
          <button
            type="button"
            className="primary-button"
            disabled={isSaving}
            onClick={() => void handleSubmit()}
          >
            {isSaving ? 'Guardando...' : form.id ? 'Guardar cambios' : 'Publicar novedad'}
          </button>
          {form.id ? (
            <button type="button" className="ghost-button" onClick={resetForm} disabled={isSaving}>
              Cancelar edicion
            </button>
          ) : null}
        </div>
      </section>

      <div className="admin-group-meetings-list">
        {news.length === 0 ? (
          <article className="list-card student-calendar-card student-calendar-empty-card">
            <p>Todavia no hay novedades publicadas.</p>
          </article>
        ) : (
          news.map((item) => (
            <article className="admin-group-meeting-card" key={item.id}>
              <div className="admin-group-meeting-copy">
                <div className="admin-group-meeting-head">
                  <strong>{item.title}</strong>
                  <span className={item.isPublished ? 'status-chip status-active' : 'status-chip status-neutral'}>
                    {item.isPublished ? 'Publicada' : 'Borrador'}
                  </span>
                </div>
                <p className="admin-news-body">{item.body}</p>
                <p className="admin-news-date">{formatDate(item.createdAt)}</p>
              </div>
              <div className="admin-group-meeting-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => startEdit(item)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => void handleDelete(item.id)}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
