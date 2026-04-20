'use client';

import { useState } from 'react';

export type RegistrationCode = {
  id: string;
  code: string;
  label: string | null;
  role: 'ADMIN' | 'MENTOR' | 'STUDENT';
  isActive: boolean;
  usageCount: number;
  maxUses: number | null;
  createdAt: string;
};

type CodeFormState = {
  id: string | null;
  code: string;
  label: string;
  role: 'ADMIN' | 'MENTOR' | 'STUDENT';
  maxUses: string;
  isActive: boolean;
};

const ROLE_LABELS: Record<RegistrationCode['role'], string> = {
  ADMIN: 'Administrador',
  MENTOR: 'Mentor',
  STUDENT: 'Alumno',
};

const ROLE_CHIP_CLASS: Record<RegistrationCode['role'], string> = {
  ADMIN: 'status-chip status-danger',
  MENTOR: 'status-chip status-warn',
  STUDENT: 'status-chip status-neutral',
};

function getInitialForm(): CodeFormState {
  return {
    id: null,
    code: '',
    label: '',
    role: 'STUDENT',
    maxUses: '',
    isActive: true,
  };
}

export function AdminRegistrationCodesPanel({
  initialCodes,
}: {
  initialCodes: RegistrationCode[];
}) {
  const [codes, setCodes] = useState(initialCodes);
  const [form, setForm] = useState<CodeFormState>(getInitialForm());
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof CodeFormState>(field: K, value: CodeFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(getInitialForm());
  }

  async function handleSubmit() {
    if (!form.code.trim()) {
      setError('El codigo es obligatorio.');
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        label: form.label.trim() || undefined,
        role: form.role,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        isActive: form.isActive,
      };

      const response = await fetch(
        form.id
          ? `/api/admin/registration-codes/${form.id}`
          : '/api/admin/registration-codes',
        {
          method: form.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form.id ? { label: payload.label, maxUses: payload.maxUses, isActive: payload.isActive } : payload),
        },
      );

      const result = (await response.json()) as RegistrationCode & { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? 'No pudimos guardar el codigo.');
      }

      setCodes((current) =>
        form.id
          ? current.map((c) => (c.id === result.id ? result : c))
          : [result, ...current],
      );
      setMessage(form.id ? 'Codigo actualizado.' : 'Codigo creado.');
      resetForm();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'No pudimos guardar el codigo.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(codeId: string) {
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/registration-codes/${codeId}`, {
        method: 'DELETE',
      });
      const result = (await response.json()) as { success?: boolean; message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? 'No pudimos eliminar el codigo.');
      }

      setCodes((current) => current.filter((c) => c.id !== codeId));
      if (form.id === codeId) resetForm();
      setMessage('Codigo eliminado.');
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'No pudimos eliminar el codigo.',
      );
    }
  }

  async function handleToggleActive(code: RegistrationCode) {
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/registration-codes/${code.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !code.isActive }),
      });
      const result = (await response.json()) as RegistrationCode & { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? 'No pudimos actualizar el codigo.');
      }

      setCodes((current) => current.map((c) => (c.id === result.id ? result : c)));
    } catch (toggleError) {
      setError(
        toggleError instanceof Error ? toggleError.message : 'No pudimos actualizar el codigo.',
      );
    }
  }

  return (
    <div className="admin-settings-section admin-reg-codes-shell">
      <section className="admin-reg-codes-form">
        <div className="admin-settings-panel-header">
          <div>
            <p className="eyebrow">Codigos de registro</p>
            <h4>{form.id ? 'Editar codigo' : 'Nuevo codigo'}</h4>
            <p>
              Cada codigo crea una cuenta con el rol asignado. El valor se normaliza a mayusculas automaticamente.
            </p>
          </div>
        </div>

        <div className="admin-settings-grid">
          <label className="admin-group-meetings-field">
            <span>Valor del codigo</span>
            {form.id ? (
              <input type="text" value={form.code} disabled className="admin-reg-codes-disabled-input" />
            ) : (
              <input
                type="text"
                value={form.code}
                onChange={(e) => updateField('code', e.target.value)}
                placeholder="VMT2026ADMIN"
                required
              />
            )}
          </label>

          <label className="admin-group-meetings-field">
            <span>Etiqueta (opcional)</span>
            <input
              type="text"
              value={form.label}
              onChange={(e) => updateField('label', e.target.value)}
              placeholder="Ej: Acceso para el equipo"
            />
          </label>

          <label className="admin-group-meetings-field">
            <span>Rol que crea</span>
            <select
              value={form.role}
              onChange={(e) => updateField('role', e.target.value as CodeFormState['role'])}
              disabled={!!form.id}
            >
              <option value="STUDENT">Alumno</option>
              <option value="MENTOR">Mentor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>

          <label className="admin-group-meetings-field">
            <span>Limite de usos</span>
            <small>Vacio = ilimitado.</small>
            <input
              type="number"
              min="1"
              value={form.maxUses}
              onChange={(e) => updateField('maxUses', e.target.value)}
              placeholder="Sin limite"
            />
          </label>

          <label className="admin-settings-toggle-card admin-reg-codes-toggle">
            <div>
              <strong>Codigo activo</strong>
              <span>Si esta desactivado no se puede usar para registrarse.</span>
            </div>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => updateField('isActive', e.target.checked)}
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
            {isSaving ? 'Guardando...' : form.id ? 'Guardar cambios' : 'Crear codigo'}
          </button>
          {form.id ? (
            <button type="button" className="ghost-button" onClick={resetForm} disabled={isSaving}>
              Cancelar edicion
            </button>
          ) : null}
        </div>
      </section>

      <div className="admin-group-meetings-list">
        {codes.length === 0 ? (
          <article className="list-card student-calendar-card student-calendar-empty-card">
            <p>Todavia no hay codigos de registro configurados.</p>
          </article>
        ) : (
          codes.map((code) => (
            <article className="admin-group-meeting-card admin-reg-code-card" key={code.id}>
              <div className="admin-group-meeting-copy">
                <div className="admin-group-meeting-head">
                  <strong className="admin-reg-code-value">{code.code}</strong>
                  <span className={ROLE_CHIP_CLASS[code.role]}>{ROLE_LABELS[code.role]}</span>
                  <span className={code.isActive ? 'status-chip status-active' : 'status-chip status-inactive'}>
                    {code.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                {code.label ? <p>{code.label}</p> : null}
                <p className="admin-reg-code-usage">
                  {code.usageCount} uso{code.usageCount !== 1 ? 's' : ''}
                  {code.maxUses !== null ? ` / ${code.maxUses} maximo` : ' (sin limite)'}
                </p>
              </div>
              <div className="admin-group-meeting-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    setMessage(null);
                    setError(null);
                    setForm({
                      id: code.id,
                      code: code.code,
                      label: code.label ?? '',
                      role: code.role,
                      maxUses: code.maxUses !== null ? String(code.maxUses) : '',
                      isActive: code.isActive,
                    });
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => void handleToggleActive(code)}
                >
                  {code.isActive ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => void handleDelete(code.id)}
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
