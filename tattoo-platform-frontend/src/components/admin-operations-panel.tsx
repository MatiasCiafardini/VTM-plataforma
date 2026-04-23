'use client';

import { useMemo, useState } from 'react';
import {
  AdminGroupMeetingsPanel,
  type GroupMeeting,
} from './admin-group-meetings-panel';
import {
  AdminRegistrationCodesPanel,
  type RegistrationCode,
} from './admin-registration-codes-panel';
import { AdminNewsPanel, type NewsItem } from './admin-news-panel';

type AdminSettings = {
  userOperations: {
    defaultStudentStatus: 'ACTIVE' | 'INACTIVE';
    defaultMentorStatus: 'ACTIVE' | 'INACTIVE';
    inactivityThresholdDays: number;
    goodStandingLabel: string;
    riskStandingLabel: string;
    studentRegistrationCode: string;
  };
  metrics: {
    revenueMetricSlug: string;
    leadsMetricSlug: string;
    closuresMetricSlug: string;
    noMetricsWeight: number;
    incomeDropWeight: number;
    leadsDropWeight: number;
    closuresDropWeight: number;
    goalsMissedWeight: number;
    inactivityWeight: number;
    warningThreshold: number;
    riskThreshold: number;
    inactivityDays: number;
    staleDraftDays: number;
  };
  notifications: {
    monthEndReminderDay: number;
    remindStudentsForPendingMetrics: boolean;
    remindAdminsForPendingMetrics: boolean;
    notifyStudentOnAchievement: boolean;
    notifyAdminsOnAchievement: boolean;
    notifyAdminsOnRisk: boolean;
  };
};

type TabKey = 'users' | 'metrics' | 'notifications' | 'meetings' | 'codes' | 'noticias';

const tabMeta: Array<{
  key: TabKey;
  title: string;
  eyebrow: string;
  description: string;
}> = [
  {
    key: 'users',
    title: 'Operacion de usuarios',
    eyebrow: 'Altas y estados',
    description:
      'Define estados iniciales y como se interpreta la inactividad dentro de la plataforma.',
  },
  {
    key: 'metrics',
    title: 'Configuracion de metricas',
    eyebrow: 'Score y riesgo',
    description:
      'Controla los slugs usados por el sistema y los puntos de riesgo que impactan en seguimiento y riesgo.',
  },
  {
    key: 'notifications',
    title: 'Notificaciones',
    eyebrow: 'Alertas automaticas',
    description:
      'Decide cuando avisar por carga mensual, logros completados y cambios de riesgo.',
  },
  {
    key: 'meetings',
    title: 'Reuniones grupales',
    eyebrow: 'Agenda compartida',
    description:
      'Carga reuniones del grupo usando tu horario local y comparte enlaces o descripciones.',
  },
  {
    key: 'codes',
    title: 'Codigos de registro',
    eyebrow: 'Acceso al sistema',
    description:
      'Crea y administra los codigos que permiten registrarse con cada rol de la plataforma.',
  },
  {
    key: 'noticias',
    title: 'Novedades',
    eyebrow: 'Panel de noticias',
    description:
      'Publica novedades que aparecen en el dashboard de los alumnos. Podes notificarlos al instante.',
  },
];

export function AdminOperationsPanel({
  initialSettings,
  initialMeetings,
  initialCodes,
  initialNews,
}: {
  initialSettings: AdminSettings;
  initialMeetings: GroupMeeting[];
  initialCodes: RegistrationCode[];
  initialNews: NewsItem[];
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [activeTab, setActiveTab] = useState<TabKey>('users');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateSection<
    SectionKey extends keyof AdminSettings,
    FieldKey extends keyof AdminSettings[SectionKey],
  >(section: SectionKey, field: FieldKey, value: AdminSettings[SectionKey][FieldKey]) {
    setSettings((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? 'No pudimos guardar la configuracion.');
      }

      setSettings(payload);
      setMessage('Configuracion guardada.');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No pudimos guardar la configuracion.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  const currentTab = useMemo(
    () => tabMeta.find((tab) => tab.key === activeTab) ?? tabMeta[0],
    [activeTab],
  );

  return (
    <section className="admin-operations-shell">
      <header className="admin-challenges-header">
        <div>
          <div className="admin-challenges-title-row">
            <span className="admin-challenges-title-icon">#</span>
            <div>
              <h3>Configuracion del sistema</h3>
              <p>Ordenada por secciones para administrar operacion, riesgo y alertas.</p>
            </div>
          </div>
        </div>
      </header>

      <div className="admin-settings-layout">
        <aside className="admin-settings-tabs">
          <p className="eyebrow">Menu</p>
          <div className="admin-settings-tab-list">
            {tabMeta.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={
                  activeTab === tab.key
                    ? 'admin-settings-tab admin-settings-tab-active'
                    : 'admin-settings-tab'
                }
                onClick={() => setActiveTab(tab.key)}
              >
                <span>{tab.eyebrow}</span>
                <strong>{tab.title}</strong>
                <small>{tab.description}</small>
              </button>
            ))}
          </div>
        </aside>

        <form
          className="admin-settings-panel"
          onSubmit={activeTab === 'meetings' || activeTab === 'codes' || activeTab === 'noticias' ? (event) => event.preventDefault() : handleSubmit}
        >
          <div className="admin-settings-panel-header">
            <div>
              <p className="eyebrow">{currentTab.eyebrow}</p>
              <h4>{currentTab.title}</h4>
              <p>{currentTab.description}</p>
            </div>
            <div className="admin-settings-panel-hint">
              <strong>Vista actual</strong>
              <span>
                {activeTab === 'users'
                  ? 'Altas, defaults y lectura de estado.'
                  : activeTab === 'metrics'
                    ? 'Slugs, puntos de riesgo y umbrales del score.'
                    : activeTab === 'notifications'
                      ? 'Alertas del header y automatizaciones.'
                      : activeTab === 'codes'
                    ? 'Codigos activos, roles y conteo de usos.'
                    : activeTab === 'noticias'
                    ? 'Novedades publicadas y borradores.'
                    : 'Agenda del grupo visible para todos los alumnos.'}
              </span>
            </div>
          </div>

          {activeTab === 'users' ? (
            <div className="admin-settings-section">
              <div className="admin-settings-grid">
                <label>
                  <span>Estado por defecto de alumnos</span>
                  <select
                    value={settings.userOperations.defaultStudentStatus}
                    onChange={(event) =>
                      updateSection(
                        'userOperations',
                        'defaultStudentStatus',
                        event.target.value as 'ACTIVE' | 'INACTIVE',
                      )
                    }
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                  </select>
                </label>

                <label>
                  <span>Estado por defecto de mentores</span>
                  <select
                    value={settings.userOperations.defaultMentorStatus}
                    onChange={(event) =>
                      updateSection(
                        'userOperations',
                        'defaultMentorStatus',
                        event.target.value as 'ACTIVE' | 'INACTIVE',
                      )
                    }
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                  </select>
                </label>

                <label>
                  <span>Dias de inactividad</span>
                  <input
                    type="number"
                    min="1"
                    value={settings.userOperations.inactivityThresholdDays}
                    onChange={(event) =>
                      updateSection(
                        'userOperations',
                        'inactivityThresholdDays',
                        Number(event.target.value),
                      )
                    }
                  />
                </label>

                <label>
                  <span>Etiqueta estado bueno</span>
                  <input
                    type="text"
                    value={settings.userOperations.goodStandingLabel}
                    onChange={(event) =>
                      updateSection('userOperations', 'goodStandingLabel', event.target.value)
                    }
                  />
                </label>

                <label>
                  <span>Etiqueta estado en riesgo</span>
                  <input
                    type="text"
                    value={settings.userOperations.riskStandingLabel}
                    onChange={(event) =>
                      updateSection('userOperations', 'riskStandingLabel', event.target.value)
                    }
                  />
                </label>

                <label>
                  <span>Codigo de registro para alumnos</span>
                  <input
                    type="text"
                    value={settings.userOperations.studentRegistrationCode}
                    onChange={(event) =>
                      updateSection(
                        'userOperations',
                        'studentRegistrationCode',
                        event.target.value,
                      )
                    }
                  />
                  <small>
                    Este codigo se pide en la pantalla de registro y lo puedes cambiar cuando quieras.
                  </small>
                </label>
              </div>
            </div>
          ) : null}

          {activeTab === 'metrics' ? (
            <div className="admin-settings-section">
              <div className="admin-settings-grid">
                <label>
                  <span>Slug ingreso</span>
                  <input
                    type="text"
                    value={settings.metrics.revenueMetricSlug}
                    onChange={(event) =>
                      updateSection('metrics', 'revenueMetricSlug', event.target.value)
                    }
                  />
                </label>

                <label>
                  <span>Slug consultas</span>
                  <input
                    type="text"
                    value={settings.metrics.leadsMetricSlug}
                    onChange={(event) =>
                      updateSection('metrics', 'leadsMetricSlug', event.target.value)
                    }
                  />
                </label>

                <label>
                  <span>Slug cierres</span>
                  <input
                    type="text"
                    value={settings.metrics.closuresMetricSlug}
                    onChange={(event) =>
                      updateSection('metrics', 'closuresMetricSlug', event.target.value)
                    }
                  />
                </label>
              </div>

              <div className="admin-settings-grid">
                {[
                  ['noMetricsWeight', 'Puntos de riesgo por no cargar metricas'],
                  ['incomeDropWeight', 'Puntos de riesgo por baja de ingresos'],
                  ['leadsDropWeight', 'Puntos de riesgo por baja de consultas'],
                  ['closuresDropWeight', 'Puntos de riesgo por baja de cierres'],
                  ['goalsMissedWeight', 'Puntos de riesgo por objetivos incumplidos'],
                  ['inactivityWeight', 'Puntos de riesgo por inactividad'],
                  ['warningThreshold', 'Umbral seguimiento'],
                  ['riskThreshold', 'Umbral riesgo'],
                  ['inactivityDays', 'Dias para considerar inactividad'],
                  ['staleDraftDays', 'Dias de borrador vencido'],
                ].map(([field, label]) => (
                  <label key={field}>
                    <span>{label}</span>
                    <input
                      type="number"
                      min="0"
                      value={settings.metrics[field as keyof AdminSettings['metrics']]}
                      onChange={(event) =>
                        updateSection(
                          'metrics',
                          field as keyof AdminSettings['metrics'],
                          Number(event.target.value) as never,
                        )
                      }
                    />
                    {field === 'warningThreshold' ? (
                      <small>Desde este puntaje el alumno pasa a seguimiento.</small>
                    ) : field === 'riskThreshold' ? (
                      <small>Desde este puntaje el alumno pasa a estado en riesgo.</small>
                    ) : field === 'inactivityDays' || field === 'staleDraftDays' ? (
                      <small>Define en cuántos dias se activa esta regla.</small>
                    ) : (
                      <small>Cuantos puntos suma esta condicion al attention score.</small>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === 'notifications' ? (
            <div className="admin-settings-section">
              <div className="admin-settings-grid">
                <label>
                  <span>Dia de recordatorio fin de mes</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={settings.notifications.monthEndReminderDay}
                    onChange={(event) =>
                      updateSection(
                        'notifications',
                        'monthEndReminderDay',
                        Number(event.target.value),
                      )
                    }
                  />
                </label>
              </div>

              <div className="admin-settings-toggle-list">
                {[
                  ['remindStudentsForPendingMetrics', 'Avisar a alumnos por carga pendiente'],
                  ['remindAdminsForPendingMetrics', 'Avisar a admins por carga pendiente'],
                  ['notifyStudentOnAchievement', 'Avisar a alumnos por logro completado'],
                  ['notifyAdminsOnAchievement', 'Avisar a admins por logro completado'],
                  ['notifyAdminsOnRisk', 'Avisar a admins cuando alguien pase a riesgo'],
                ].map(([field, label]) => (
                  <label className="admin-settings-toggle-card" key={field}>
                    <div>
                      <strong>{label}</strong>
                      <span>
                        {field === 'notifyAdminsOnRisk'
                          ? 'Se refleja en la campanita del header.'
                          : 'Se genera automaticamente cuando se cumple la condicion.'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(
                        settings.notifications[field as keyof AdminSettings['notifications']],
                      )}
                      onChange={(event) =>
                        updateSection(
                          'notifications',
                          field as keyof AdminSettings['notifications'],
                          event.target.checked as never,
                        )
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === 'meetings' ? (
            <AdminGroupMeetingsPanel initialMeetings={initialMeetings} />
          ) : null}

          {activeTab === 'codes' ? (
            <AdminRegistrationCodesPanel initialCodes={initialCodes} />
          ) : null}

          {activeTab === 'noticias' ? (
            <AdminNewsPanel initialNews={initialNews} />
          ) : null}

          {activeTab !== 'meetings' && activeTab !== 'codes' && activeTab !== 'noticias' ? (
            <>
              {message ? <p className="student-results-form-success">{message}</p> : null}
              {error ? <p className="student-results-form-error">{error}</p> : null}

              <div className="student-results-form-actions">
                <button type="submit" className="primary-button" disabled={isSaving}>
                  {isSaving ? 'Guardando...' : 'Guardar configuracion'}
                </button>
              </div>
            </>
          ) : null}
        </form>
      </div>
    </section>
  );
}
