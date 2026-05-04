'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type QuickLink = {
  id: string;
  title: string;
  url: string;
};

type Currency = {
  id: string;
  code: string;
  name?: string;
  symbol: string | null;
};

type AdminProfileData = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  adminProfile: {
    nationality: string | null;
    country: string | null;
    birthDate: string | null;
    startDate: string | null;
    localCurrency: Currency | null;
  } | null;
};

function formatDate(date: string | null | undefined) {
  if (!date) {
    return '-';
  }
  // Parse date-only strings (YYYY-MM-DD) without timezone offset
  const dateOnly = date.slice(0, 10);
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR').format(new Date(year, month - 1, day));
}

function normalizeLinkUrl(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `https://${url}`;
}

function splitFullName(fullName: string) {
  const normalized = fullName.trim().replace(/\s+/g, ' ');

  if (!normalized) {
    return { firstName: '', lastName: '' };
  }

  const parts = normalized.split(' ');

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function formatCurrencyOptionLabel(currency: Currency) {
  const name = currency.name ?? currency.code;
  return `${currency.code} - ${name}${currency.symbol ? ` (${currency.symbol})` : ''}`;
}

export function AdminProfilePanel({
  displayName,
  initialQuickLinks,
  profile,
  currencies,
}: {
  displayName: string;
  initialQuickLinks: QuickLink[];
  profile: AdminProfileData;
  currencies: Currency[];
}) {
  const router = useRouter();
  const fullNameFallback = `${profile.firstName} ${profile.lastName}`.trim() || displayName;
  const [links, setLinks] = useState<QuickLink[]>(initialQuickLinks);
  const [isExpanded, setIsExpanded] = useState(false);
  const [form, setForm] = useState({
    fullName: fullNameFallback,
    nationality: profile.adminProfile?.nationality ?? '',
    country: profile.adminProfile?.country ?? '',
    localCurrencyId: profile.adminProfile?.localCurrency?.id ?? '',
    birthDate: profile.adminProfile?.birthDate
      ? profile.adminProfile.birthDate.slice(0, 10)
      : '',
    startDate: profile.adminProfile?.startDate
      ? profile.adminProfile.startDate.slice(0, 10)
      : '',
  });
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage(null);
    setProfileError(null);

    try {
      const { firstName, lastName } = splitFullName(form.fullName || fullNameFallback);
      const response = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          nationality: form.nationality || undefined,
          country: form.country || undefined,
          localCurrencyId: form.localCurrencyId || undefined,
          birthDate: form.birthDate || undefined,
          startDate: form.startDate || undefined,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? 'No pudimos guardar tu perfil.');
      }

      setForm((current) => ({
        ...current,
        fullName: `${payload.firstName} ${payload.lastName}`.trim(),
        nationality: payload.adminProfile?.nationality ?? '',
        country: payload.adminProfile?.country ?? '',
        localCurrencyId: payload.adminProfile?.localCurrency?.id ?? '',
        birthDate: payload.adminProfile?.birthDate
          ? payload.adminProfile.birthDate.slice(0, 10)
          : '',
        startDate: payload.adminProfile?.startDate
          ? payload.adminProfile.startDate.slice(0, 10)
          : '',
      }));
      setProfileMessage('Informacion personal actualizada.');
      router.refresh();
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : 'No pudimos guardar tu perfil.',
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleAddLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = linkTitle.trim();
    const rawUrl = linkUrl.trim();
    if (!title || !rawUrl) {
      return;
    }

    const normalizedUrl = normalizeLinkUrl(rawUrl);

    setIsSubmittingLink(true);

    try {
      const response = await fetch('/api/admin/quick-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          url: normalizedUrl,
          sortOrder: links.length,
        }),
      });

      if (!response.ok) {
        throw new Error('No pudimos guardar tu acceso rapido.');
      }

      const created = (await response.json()) as QuickLink;
      setLinks((current) => [...current, created]);
      setLinkTitle('');
      setLinkUrl('');
    } finally {
      setIsSubmittingLink(false);
    }
  }

  async function handleDeleteLink(linkId: string) {
    const response = await fetch(`/api/admin/quick-links/${linkId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('No pudimos quitar tu acceso rapido.');
    }

    setLinks((current) => current.filter((link) => link.id !== linkId));
  }

  const selectedCurrency =
    currencies.find((currency) => currency.id === form.localCurrencyId) ??
    profile.adminProfile?.localCurrency ??
    null;

  return (
    <section className="profile-shell">
      <header className="profile-page-header">
        <h3>Mi Perfil</h3>
      </header>

      <article className={`profile-card profile-personal-card ${isExpanded ? 'profile-card-expanded' : ''}`}>
        <div className="profile-personal-summary student-profile-summary">
          <div className="profile-card-header">
            <h4>
              <span className="profile-card-icon" aria-hidden="true">
                o
              </span>
              Informacion Personal
            </h4>
          </div>

          <div className="profile-personal-preview student-profile-preview">
            <div className="profile-preview-item">
              <span>Nombre</span>
              <strong>{form.fullName || fullNameFallback}</strong>
            </div>
            <div className="profile-preview-item">
              <span>Pais</span>
              <strong>{form.country || '-'}</strong>
            </div>
            <div className="profile-preview-item">
              <span>Moneda local</span>
              <strong>{selectedCurrency ? formatCurrencyOptionLabel(selectedCurrency) : '-'}</strong>
            </div>
            <div className="profile-preview-item">
              <span>Inicio</span>
              <strong>{form.startDate ? formatDate(form.startDate) : formatDate(profile.createdAt)}</strong>
            </div>
          </div>

          <button
            type="button"
            className="ghost-button student-profile-configure-button"
            onClick={() => setIsExpanded((current) => !current)}
          >
            {isExpanded ? 'Cerrar configuracion' : 'Editar informacion personal'}
          </button>
        </div>

        {isExpanded ? (
          <div className="profile-personal-content">
            <form className="student-profile-form" onSubmit={handleSaveProfile}>
              <div className="profile-personal-grid">
                <label>
                  <span>Nombre completo</span>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(event) => updateField('fullName', event.target.value)}
                    placeholder="Nombre y apellido"
                  />
                </label>
                <label>
                  <span>Nacionalidad</span>
                  <input
                    type="text"
                    value={form.nationality}
                    onChange={(event) => updateField('nationality', event.target.value)}
                    placeholder="Argentina"
                  />
                </label>
                <label>
                  <span>Pais</span>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(event) => updateField('country', event.target.value)}
                    placeholder="Argentina"
                  />
                </label>
                <label>
                  <span>Moneda local</span>
                  <select
                    value={form.localCurrencyId}
                    onChange={(event) => updateField('localCurrencyId', event.target.value)}
                  >
                    <option value="">Seleccionar moneda</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {formatCurrencyOptionLabel(currency)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Fecha de nacimiento</span>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(event) => updateField('birthDate', event.target.value)}
                  />
                </label>
                <label>
                  <span>Inicio</span>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) => updateField('startDate', event.target.value)}
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input type="text" value={profile.email} readOnly />
                </label>
                <label>
                  <span>Ultimo acceso</span>
                  <input type="text" value={formatDate(profile.lastLoginAt)} readOnly />
                </label>
              </div>

              {profileError ? <p className="student-results-form-error">{profileError}</p> : null}
              {profileMessage ? <p className="student-profile-success">{profileMessage}</p> : null}

              <div className="student-results-form-actions">
                <button type="submit" className="primary-button" disabled={isSavingProfile}>
                  {isSavingProfile ? 'Guardando...' : 'Guardar informacion'}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </article>

      <article className="profile-card profile-links-card">
        <div className="profile-card-header">
          <h4>
            <span className="profile-card-icon" aria-hidden="true">
              o-o
            </span>
            Mis Links
          </h4>
          <p>Guarda tus accesos rapidos personales y tenelos siempre a mano.</p>
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
          <p className="profile-empty-state">Todavia no cargaste accesos rapidos personales.</p>
        )}

        <form className="profile-link-form" onSubmit={handleAddLink}>
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
          <button type="submit" disabled={isSubmittingLink}>
            {isSubmittingLink ? 'Guardando...' : '+ Agregar'}
          </button>
        </form>
      </article>
    </section>
  );
}
