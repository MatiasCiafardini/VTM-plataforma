'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getCurrencyCodeForCountry, supportedCountries } from '@/lib/countries';

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

type StudentProfileData = {
  id: string;
  nationality: string | null;
  country: string | null;
  instagramHandle: string | null;
  birthDate: string | null;
  timezone: string | null;
  displayCurrencyMode: 'LOCAL' | 'USD' | 'BOTH';
  localCurrency: Currency | null;
  user: {
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    lastLoginAt: string | null;
    createdAt: string;
  };
};

type ChallengeReward = {
  id: string;
  challengeTitle: string;
  rewardTitle: string;
  rewardUrl: string | null;
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
  const regionalNames: Record<string, string> = {
    ARS: 'Peso argentino',
    CLP: 'Peso chileno',
    COP: 'Peso colombiano',
    MXN: 'Peso mexicano',
    PEN: 'Sol peruano',
    UYU: 'Peso uruguayo',
    BRL: 'Real brasileno',
    EUR: 'Euro',
    USD: 'Dolar estadounidense',
  };

  const name = currency.name ?? regionalNames[currency.code] ?? currency.code;
  return `${currency.code} · ${name}${currency.symbol ? ` (${currency.symbol})` : ''}`;
}

export function StudentProfilePanel({
  profile,
  initialLinks,
  currencies,
  challengeRewards,
}: {
  profile: StudentProfileData;
  initialLinks: QuickLink[];
  currencies: Currency[];
  challengeRewards: ChallengeReward[];
}) {
  const router = useRouter();
  const fallbackName = `${profile.user.firstName} ${profile.user.lastName}`.trim();

  const [isExpanded, setIsExpanded] = useState(false);
  const [links, setLinks] = useState(initialLinks);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: fallbackName,
    nationality: profile.nationality ?? '',
    country: profile.country ?? '',
    instagramHandle: profile.instagramHandle ?? '',
    birthDate: profile.birthDate ? profile.birthDate.slice(0, 10) : '',
    timezone: profile.timezone ?? '',
    localCurrencyId: profile.localCurrency?.id ?? '',
    displayCurrencyMode: profile.displayCurrencyMode ?? 'BOTH',
  });

  function updateForm(field: keyof typeof form, value: string) {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === 'country') {
        const inferredCurrencyCode = getCurrencyCodeForCountry(value);
        const inferredCurrency = currencies.find(
          (currency) => currency.code === inferredCurrencyCode,
        );

        if (inferredCurrency) {
          next.localCurrencyId = inferredCurrency.id;
        }
      }

      return next;
    });
  }

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const { firstName, lastName } = splitFullName(form.fullName || fallbackName);
      const response = await fetch('/api/student/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          nationality: form.nationality || undefined,
          country: form.country || undefined,
          instagramHandle: form.instagramHandle || undefined,
          birthDate: form.birthDate || undefined,
          timezone: form.timezone || undefined,
          localCurrencyId: form.localCurrencyId || undefined,
          displayCurrencyMode: form.displayCurrencyMode,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? 'No pudimos guardar tu informacion.');
      }

      setForm({
        fullName: `${payload.user.firstName} ${payload.user.lastName}`.trim(),
        nationality: payload.nationality ?? '',
        country: payload.country ?? '',
        instagramHandle: payload.instagramHandle ?? '',
        birthDate: payload.birthDate ? payload.birthDate.slice(0, 10) : '',
        timezone: payload.timezone ?? '',
        localCurrencyId: payload.localCurrency?.id ?? '',
        displayCurrencyMode: payload.displayCurrencyMode ?? 'BOTH',
      });
      setProfileMessage('Informacion personal actualizada.');
      router.refresh();
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : 'No pudimos guardar tu informacion.',
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleAddLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingLink(true);
    setLinkError(null);
    setLinkMessage(null);

    try {
      const title = linkTitle.trim();
      const url = linkUrl.trim();

      if (!title || !url) {
        throw new Error('Completa nombre y URL para crear el acceso rapido.');
      }

      const response = await fetch('/api/student/links', {
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
      router.refresh();
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

    const response = await fetch(`/api/student/links/${linkId}`, {
      method: 'DELETE',
    });

    const payload = await response.json();

    if (!response.ok) {
      setLinkError(payload.message ?? 'No pudimos quitar el acceso rapido.');
      return;
    }

    setLinks((current) => current.filter((link) => link.id !== linkId));
    setLinkMessage('Acceso rapido eliminado.');
    router.refresh();
  }

  const selectedCurrency =
    currencies.find((currency) => currency.id === form.localCurrencyId) ?? profile.localCurrency;
  const localCurrencyLabel = selectedCurrency
    ? formatCurrencyOptionLabel(selectedCurrency)
    : 'Sin definir';

  return (
    <section className="profile-shell student-profile-shell">
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
              <strong>{form.fullName || fallbackName}</strong>
            </div>
            <div className="profile-preview-item">
              <span>Pais</span>
              <strong>{form.country || '-'}</strong>
            </div>
            <div className="profile-preview-item">
              <span>Instagram</span>
              <strong>{form.instagramHandle ? `@${form.instagramHandle}` : '-'}</strong>
            </div>
            <div className="profile-preview-item">
              <span>Moneda local</span>
              <strong>{localCurrencyLabel}</strong>
            </div>
            <div className="profile-preview-item">
              <span>Inicio</span>
              <strong>{formatDate(profile.user.createdAt)}</strong>
            </div>
          </div>

          <button
            type="button"
            className="ghost-button student-profile-configure-button"
            onClick={() => setIsExpanded((current) => !current)}
          >
            {isExpanded ? 'Cerrar configuracion' : 'Configurar informacion personal'}
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
                    onChange={(event) => updateForm('fullName', event.target.value)}
                    placeholder="Nombre y apellido"
                  />
                </label>
                <label>
                  <span>Nacionalidad</span>
                  <input
                    type="text"
                    value={form.nationality}
                    onChange={(event) => updateForm('nationality', event.target.value)}
                    placeholder="Argentina"
                  />
                </label>
                <label>
                  <span>Fecha de nacimiento</span>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(event) => updateForm('birthDate', event.target.value)}
                  />
                </label>
                <label>
                  <span>Pais</span>
                  <select
                    value={form.country}
                    onChange={(event) => updateForm('country', event.target.value)}
                  >
                    <option value="">Seleccionar pais</option>
                    {supportedCountries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Instagram</span>
                  <input
                    type="text"
                    value={form.instagramHandle}
                    onChange={(event) => updateForm('instagramHandle', event.target.value)}
                    placeholder="@tuusuario"
                  />
                </label>
                <label>
                  <span>Zona horaria</span>
                  <input
                    type="text"
                    value={form.timezone}
                    onChange={(event) => updateForm('timezone', event.target.value)}
                    placeholder="America/Argentina/Buenos_Aires"
                  />
                </label>
                <label>
                  <span>Moneda local</span>
                  <select
                    value={form.localCurrencyId}
                    onChange={(event) => updateForm('localCurrencyId', event.target.value)}
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
                  <span>Visualizacion de moneda</span>
                  <select
                    value={form.displayCurrencyMode}
                    onChange={(event) => updateForm('displayCurrencyMode', event.target.value)}
                  >
                    <option value="LOCAL">Solo local</option>
                    <option value="USD">Solo USD</option>
                    <option value="BOTH">Ambas</option>
                  </select>
                </label>
                <label>
                  <span>Email</span>
                  <input type="text" value={profile.user.email} readOnly />
                </label>
                <label>
                  <span>Inicio</span>
                  <input type="text" value={formatDate(profile.user.createdAt)} readOnly />
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

      <article className="profile-card profile-links-card student-links-card">
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
          <button type="submit" disabled={isSavingLink}>
            {isSavingLink ? 'Guardando...' : '+ Agregar'}
          </button>
        </form>

        {linkError ? <p className="student-results-form-error">{linkError}</p> : null}
        {linkMessage ? <p className="student-profile-success">{linkMessage}</p> : null}
      </article>

      <article className="profile-card student-rewards-card">
        <div className="profile-card-header">
          <h4>
            <span className="profile-card-icon" aria-hidden="true">
              *
            </span>
            Recompensas de desafios
          </h4>
          <p>Encuentra aqui todas las recompensas que ya desbloqueaste y de que desafio vienen.</p>
        </div>

        {challengeRewards.length > 0 ? (
          <div className="student-rewards-list">
            {challengeRewards.map((reward) => (
              <article key={reward.id} className="student-reward-row">
                <div className="student-reward-copy">
                  <span className="student-reward-kicker">Desafio ganado</span>
                  <strong>{reward.challengeTitle}</strong>
                  <p>Recompensa desbloqueada: {reward.rewardTitle}</p>
                </div>
                {reward.rewardUrl ? (
                  <a
                    href={reward.rewardUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ghost-button student-reward-link"
                  >
                    Abrir recurso
                  </a>
                ) : (
                  <span className="student-reward-no-link">Sin URL cargada</span>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="profile-empty-state">Todavia no desbloqueaste recompensas de desafios.</p>
        )}
      </article>

      <article className="profile-card student-account-card">
        <div className="profile-card-header">
          <h4>
            <span className="profile-card-icon" aria-hidden="true">
              []
            </span>
            Cuenta
          </h4>
          <p>Resumen rapido del estado de tu usuario dentro de la plataforma.</p>
        </div>

        <div className="student-account-grid">
          <div className="profile-preview-item">
            <span>Email</span>
            <strong>{profile.user.email}</strong>
          </div>
          <div className="profile-preview-item">
            <span>Estado</span>
            <strong>{profile.user.status}</strong>
          </div>
          <div className="profile-preview-item">
            <span>Ultimo acceso</span>
            <strong>{formatDate(profile.user.lastLoginAt)}</strong>
          </div>
        </div>
      </article>
    </section>
  );
}
