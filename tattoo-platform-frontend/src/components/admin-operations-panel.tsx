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

type QuickLink = {
  id: string;
  title: string;
  url: string;
};

type TabKey = 'metrics' | 'notifications' | 'meetings' | 'codes' | 'noticias' | 'links';

const tabMeta: Array<{
  key: TabKey;
  title: string;
  eyebrow: string;
  description: string;
}> = [
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
  {
    key: 'links',
    title: 'Accesos rapidos',
    eyebrow: 'Dashboard alumnos',
    description:
      'Administra las cards de enlaces que aparecen en el dashboard de los alumnos.',
  },
];

function normalizeLinkUrl(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `https://${url}`;
}

export function AdminOperationsPanel({
  initialSettings,
  initialMeetings,
  initialCodes,
  initialNews,
  initialStudentDashboardLinks,
}: {
  initialSettings: AdminSettings;
  initialMeetings: GroupMeeting[];
  initialCodes: RegistrationCode[];
  initialNews: NewsItem[];
  initialStudentDashboardLinks: QuickLink[];
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [links, setLinks] = useState<QuickLink[]>(initialStudentDashboardLinks);
  const [activeTab, setActiveTab] = useState<TabKey>('metrics');
  const [isSaving, setIsSaving] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

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

  async function handleAddLink() {
    setIsSavingLink(true);
    setLinkError(null);
    setLinkMessage(null);

    try {
      const title = linkTitle.trim();
      const url = linkUrl.trim();

      if (!title || !url) {
        throw new Error('Completa nombre y URL para crear el acceso rapido.');
      }

      const response = await fetch('/api/admin/student-dashboard-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          url: normalizeLinkUrl(url),
          sortOrder: links.length,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? 'No pudimos crear el acceso rapido.');
      }

      setLinks((current) => [...current, payload]);
      setLinkTitle('');
      setLinkUrl('');
      setLinkMessage('Acceso rapido creado.');
    } catch (error) {
      setLinkError(
        error instanceof Error ? error.message : 'No pudimos crear el acceso rapido.',
      );
    } finally {
      setIsSavingLink(false);
    }
  }

  async function handleDeleteLink(linkId: string) {
    setLinkError(null);
    setLinkMessage(null);

    const response = await fetch(`/api/admin/student-dashboard-links/${linkId}`, {
      method: 'DELETE',
    });

    const payload = await response.json();

    if (!response.ok) {
      setLinkError(payload.message ?? 'No pudimos quitar el acceso rapido.');
      return;
    }

    setLinks((current) => current.filter((link) => link.id !== linkId));
    setLinkMessage('Acceso rapido eliminado.');
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
          onSubmit={
            activeTab === 'meetings' ||
            activeTab === 'codes' ||
            activeTab === 'noticias' ||
            activeTab === 'links'
              ? (event) => event.preventDefault()
              : handleSubmit
          }
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
                {activeTab === 'metrics'
                  ? 'Slugs, puntos de riesgo y umbrales del score.'
                  : activeTab === 'notifications'
                    ? 'Alertas del header y automatizaciones.'
                    : activeTab === 'codes'
                    ? 'Codigos activos, roles y conteo de usos.'
                    : activeTab === 'noticias'
                      ? 'Novedades publicadas y borradores.'
                      : activeTab === 'links'
                        ? 'Cards visibles en accesos rapidos del dashboard alumno.'
                        : 'Agenda del grupo visible para todos los alumnos.'}
              </span>
            </div>
          </div>

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

          {activeTab === 'links' ? (
            <div className="admin-settings-section">
              <article className="profile-card profile-links-card student-links-card">
                <div className="profile-card-header">
                  <h4>
                    <span className="profile-card-icon" aria-hidden="true">
                      o-o
                    </span>
                    Accesos Rapidos de Alumnos
                  </h4>
                  <p>Estos enlaces se muestran como cards en el dashboard de los alumnos.</p>
                </div>

                {links.length > 0 ? (
                  <div className="profile-links-list">
                    {links.map((link) => (
                      <div className="profile-link-row" key={link.id}>
                        <a href={link.url} target="_blank" rel="noreferrer">
                          <strong>{link.title}</strong>
                          <span>{link.url}</span>
                        </a>
                        <button type="button" onClick={() => handleDeleteLink(link.id)}>
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="profile-empty-state">
                    Todavia no hay accesos rapidos configurados para alumnos.
                  </p>
                )}

                <div className="profile-link-form">
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={linkTitle}
                    onChange={(event) => setLinkTitle(event.target.value)}
                  />
                  <input
                    type="url"
                    placeholder="URL"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                  />
                  <button type="button" disabled={isSavingLink} onClick={handleAddLink}>
                    {isSavingLink ? 'Guardando...' : '+ Agregar'}
                  </button>
                </div>

                {linkError ? <p className="student-results-form-error">{linkError}</p> : null}
                {linkMessage ? (
                  <p className="student-profile-success">{linkMessage}</p>
                ) : null}
              </article>
            </div>
          ) : null}

          {activeTab !== 'meetings' && activeTab !== 'codes' && activeTab !== 'noticias' && activeTab !== 'links' ? (
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
