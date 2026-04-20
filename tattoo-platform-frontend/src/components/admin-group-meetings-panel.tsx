'use client';

import { useMemo, useState } from 'react';

export type GroupMeeting = {
  id: string;
  title: string;
  description: string | null;
  timezone: string;
  isRecurring: boolean;
  weekDay: number | null;
  startsAt: string;
  endsAt: string | null;
  linkUrl: string | null;
};

type MeetingType = 'once' | 'weekly';

type MeetingFormState = {
  id: string | null;
  title: string;
  meetingType: MeetingType;
  scheduledDate: string;
  weekDay: string;
  startTime: string;
  endTime: string;
  description: string;
  linkUrl: string;
};

const WEEK_DAYS = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miercoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sabado' },
];

const DEFAULT_ADMIN_TIMEZONE = 'America/Argentina/Buenos_Aires';

function getInitialFormState(): MeetingFormState {
  return {
    id: null,
    title: '',
    meetingType: 'once',
    scheduledDate: '',
    weekDay: '1',
    startTime: '',
    endTime: '',
    description: '',
    linkUrl: '',
  };
}

function formatInTimezone(value: string, timezone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: timezone,
    ...options,
  }).format(new Date(value));
}

function formatDateInput(value: string, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function toFormState(meeting: GroupMeeting, timezone: string): MeetingFormState {
  return {
    id: meeting.id,
    title: meeting.title,
    meetingType: meeting.isRecurring ? 'weekly' : 'once',
    scheduledDate: meeting.isRecurring ? '' : formatDateInput(meeting.startsAt, timezone),
    weekDay: meeting.weekDay !== null ? String(meeting.weekDay) : '1',
    startTime: formatInTimezone(meeting.startsAt, timezone, {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }),
    endTime: meeting.endsAt
      ? formatInTimezone(meeting.endsAt, timezone, {
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        })
      : '',
    description: meeting.description ?? '',
    linkUrl: meeting.linkUrl ?? '',
  };
}

function sortMeetings(meetings: GroupMeeting[]) {
  return [...meetings].sort(
    (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
  );
}

function weekDayLabel(weekDay: number) {
  return WEEK_DAYS.find((d) => d.value === String(weekDay))?.label ?? '';
}

export function AdminGroupMeetingsPanel({
  initialMeetings,
}: {
  initialMeetings: GroupMeeting[];
}) {
  const adminTimezone = useMemo(() => {
    if (typeof Intl === 'undefined') {
      return DEFAULT_ADMIN_TIMEZONE;
    }

    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_ADMIN_TIMEZONE;
  }, []);
  const [meetings, setMeetings] = useState(sortMeetings(initialMeetings));
  const [form, setForm] = useState<MeetingFormState>(getInitialFormState());
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateField<FieldKey extends keyof MeetingFormState>(
    field: FieldKey,
    value: MeetingFormState[FieldKey],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(getInitialFormState());
  }

  async function handleSubmit() {
    const isWeekly = form.meetingType === 'weekly';

    if (!form.title || !form.startTime) {
      setMessage(null);
      setError('Completa titulo y horario de inicio.');
      return;
    }

    if (!isWeekly && !form.scheduledDate) {
      setMessage(null);
      setError('Selecciona una fecha para la reunion.');
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = isWeekly
        ? {
            title: form.title,
            isRecurring: true,
            weekDay: Number(form.weekDay),
            startTime: form.startTime,
            endTime: form.endTime || (form.id ? null : undefined),
            timezone: adminTimezone,
            description: form.description,
            linkUrl: form.linkUrl,
          }
        : {
            title: form.title,
            isRecurring: false,
            scheduledDate: form.scheduledDate,
            startTime: form.startTime,
            endTime: form.endTime || (form.id ? null : undefined),
            timezone: adminTimezone,
            description: form.description,
            linkUrl: form.linkUrl,
          };

      const response = await fetch(
        form.id ? `/api/admin/group-meetings/${form.id}` : '/api/admin/group-meetings',
        {
          method: form.id ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      const nextMeeting = (await response.json()) as GroupMeeting & { message?: string };

      if (!response.ok) {
        throw new Error(nextMeeting.message ?? 'No pudimos guardar la reunion grupal.');
      }

      setMeetings((current) =>
        sortMeetings(
          form.id
            ? current.map((meeting) => (meeting.id === nextMeeting.id ? nextMeeting : meeting))
            : [...current, nextMeeting],
        ),
      );
      setMessage(form.id ? 'Reunion actualizada.' : 'Reunion creada.');
      resetForm();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No pudimos guardar la reunion grupal.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(meetingId: string) {
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/group-meetings/${meetingId}`, {
        method: 'DELETE',
      });
      const payload = (await response.json()) as { success?: boolean; message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? 'No pudimos eliminar la reunion grupal.');
      }

      setMeetings((current) => current.filter((meeting) => meeting.id !== meetingId));

      if (form.id === meetingId) {
        resetForm();
      }

      setMessage('Reunion eliminada.');
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'No pudimos eliminar la reunion grupal.',
      );
    }
  }

  return (
    <div className="admin-settings-section admin-group-meetings-shell">
      <section className="admin-group-meetings-form">
        <div className="admin-settings-panel-header">
          <div>
            <p className="eyebrow">Agenda grupal</p>
            <h4>{form.id ? 'Editar reunion' : 'Nueva reunion grupal'}</h4>
            <p>
              El horario se carga en tu zona local y luego se convierte automaticamente a la
              zona de cada alumno.
            </p>
          </div>
          <div className="admin-group-meetings-timezone-chip">
            <span>Zona detectada</span>
            <strong>{adminTimezone}</strong>
          </div>
        </div>

        <div className="admin-settings-grid">
          <label className="admin-group-meetings-field">
            <span>Titulo</span>
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              required
            />
          </label>

          <div className="admin-group-meetings-field admin-group-meetings-field-type">
            <span>Tipo de reunion</span>
            <div className="admin-group-meetings-type-toggle">
              <label className="admin-group-meetings-type-option">
                <input
                  type="radio"
                  name="meetingType"
                  value="once"
                  checked={form.meetingType === 'once'}
                  onChange={() => updateField('meetingType', 'once')}
                />
                <span>Reunion unica</span>
              </label>
              <label className="admin-group-meetings-type-option">
                <input
                  type="radio"
                  name="meetingType"
                  value="weekly"
                  checked={form.meetingType === 'weekly'}
                  onChange={() => updateField('meetingType', 'weekly')}
                />
                <span>Semanal</span>
              </label>
            </div>
          </div>

          {form.meetingType === 'once' ? (
            <label className="admin-group-meetings-field admin-group-meetings-field-date">
              <span>Fecha</span>
              <small>Se interpreta en tu horario local.</small>
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(event) => updateField('scheduledDate', event.target.value)}
                required
              />
            </label>
          ) : (
            <label className="admin-group-meetings-field admin-group-meetings-field-date">
              <span>Dia de la semana</span>
              <small>Se repite cada semana.</small>
              <select
                value={form.weekDay}
                onChange={(event) => updateField('weekDay', event.target.value)}
              >
                {WEEK_DAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="admin-group-meetings-field admin-group-meetings-field-time">
            <span>Hora de inicio</span>
            <small>Formato 24 hs.</small>
            <input
              type="time"
              value={form.startTime}
              onChange={(event) => updateField('startTime', event.target.value)}
              step="900"
              required
            />
          </label>

          <label className="admin-group-meetings-field admin-group-meetings-field-time">
            <span>Hora de cierre</span>
            <small>Opcional.</small>
            <input
              type="time"
              value={form.endTime}
              onChange={(event) => updateField('endTime', event.target.value)}
              step="900"
            />
          </label>

          <label className="admin-group-meetings-field">
            <span>Enlace de acceso</span>
            <input
              type="url"
              value={form.linkUrl}
              onChange={(event) => updateField('linkUrl', event.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </label>
        </div>

        <div className="admin-settings-grid">
          <label className="admin-group-meetings-description">
            <span>Descripcion</span>
            <textarea
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              rows={4}
              placeholder="Notas, temas a ver o instrucciones para entrar."
            />
          </label>
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
            {isSaving ? 'Guardando...' : form.id ? 'Guardar cambios' : 'Crear reunion'}
          </button>
          {form.id ? (
            <button type="button" className="ghost-button" onClick={resetForm} disabled={isSaving}>
              Cancelar edicion
            </button>
          ) : null}
        </div>
      </section>

      <div className="admin-group-meetings-list">
        {meetings.length === 0 ? (
          <article className="list-card student-calendar-card student-calendar-empty-card">
            <p>Todavia no hay reuniones grupales configuradas.</p>
          </article>
        ) : (
          meetings.map((meeting) => (
            <article className="admin-group-meeting-card" key={meeting.id}>
              <div className="admin-group-meeting-copy">
                <div className="admin-group-meeting-head">
                  <strong>{meeting.title}</strong>
                  <span className="status-chip status-neutral">
                    {meeting.isRecurring ? 'Semanal' : 'Unica'}
                  </span>
                  <span className="status-chip status-neutral">{meeting.timezone}</span>
                </div>
                <p>
                  {meeting.isRecurring && meeting.weekDay !== null
                    ? `Cada ${weekDayLabel(meeting.weekDay)}`
                    : formatInTimezone(meeting.startsAt, meeting.timezone, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                </p>
                <p>
                  {formatInTimezone(meeting.startsAt, meeting.timezone, {
                    hour: '2-digit',
                    minute: '2-digit',
                    hourCycle: 'h23',
                  })}
                  {meeting.endsAt
                    ? ` a ${formatInTimezone(meeting.endsAt, meeting.timezone, {
                        hour: '2-digit',
                        minute: '2-digit',
                        hourCycle: 'h23',
                      })}`
                    : ''}
                </p>
                {meeting.description ? <p>{meeting.description}</p> : null}
                {meeting.linkUrl ? (
                  <a href={meeting.linkUrl} target="_blank" rel="noreferrer">
                    {meeting.linkUrl}
                  </a>
                ) : null}
              </div>
              <div className="admin-group-meeting-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    setMessage(null);
                    setError(null);
                    setForm(toFormState(meeting, adminTimezone));
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => handleDelete(meeting.id)}
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
