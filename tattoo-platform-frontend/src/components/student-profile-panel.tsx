'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

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
  country: string | null;
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

type PersonalExtras = {
  fullName: string;
  nationality: string;
  birthDate: string;
};

const emptyExtras: PersonalExtras = {
  fullName: '',
  nationality: '',
  birthDate: '',
};

function formatDate(date: string | null | undefined) {
  if (!date) {
    return '-';
  }

  return new Intl.DateTimeFormat('es-AR').format(new Date(date));
}

function readStoredExtras(storageKey: string, fallbackName: string) {
  if (typeof window === 'undefined') {
    return { ...emptyExtras, fullName: fallbackName };
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return { ...emptyExtras, fullName: fallbackName };
  }

  try {
    const parsed = JSON.parse(raw) as PersonalExtras;
    return {
      ...emptyExtras,
      ...parsed,
      fullName: parsed.fullName || fallbackName,
    };
  } catch {
    window.localStorage.removeItem(storageKey);
    return { ...emptyExtras, fullName: fallbackName };
  }
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
    return {
      firstName: '',
      lastName: '',
    };
  }

  const parts = normalized.split(' ');

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: '',
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
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
}: {
  profile: StudentProfileData;
  initialLinks: QuickLink[];
  currencies: Currency[];
}) {
  const router = useRouter();
  const fallbackName = `${profile.user.firstName} ${profile.user.lastName}`.trim();
  const storageKey = useMemo(() => `student-profile-extras:${profile.id}`, [profile.id]);

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
  const [extras, setExtras] = useState<PersonalExtras>({
    ...emptyExtras,
    fullName: fallbackName,
  });
  const [form, setForm] = useState({
    country: profile.country ?? '',
    timezone: profile.timezone ?? '',
    localCurrencyId: profile.localCurrency?.id ?? '',
    displayCurrencyMode: profile.displayCurrencyMode ?? 'BOTH',
  });

  useEffect(() => {
    setExtras(readStoredExtras(storageKey, fallbackName));
  }, [storageKey, fallbackName]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(extras));
  }, [extras, storageKey]);

  function updateExtra(field: keyof PersonalExtras, value: string) {
    setExtras((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateForm(
    field: 'country' | 'timezone' | 'localCurrencyId' | 'displayCurrencyMode',
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const { firstName, lastName } = splitFullName(extras.fullName || fallbackName);
      const response = await fetch('/api/student/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          country: form.country || undefined,
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
        country: payload.country ?? '',
        timezone: payload.timezone ?? '',
        localCurrencyId: payload.localCurrency?.id ?? '',
        displayCurrencyMode: payload.displayCurrencyMode ?? 'BOTH',
      });
      setExtras((current) => ({
        ...current,
        fullName: `${payload.user.firstName} ${payload.user.lastName}`.trim(),
      }));
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
        headers: {
          'Content-Type': 'application/json',
        },
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
              <strong>{extras.fullName || fallbackName}</strong>
            </div>
            <div className="profile-preview-item">
              <span>Pais</span>
              <strong>{form.country || '-'}</strong>
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
                    value={extras.fullName}
                    onChange={(event) => updateExtra('fullName', event.target.value)}
                    placeholder="Nombre y apellido"
                  />
                </label>
                <label>
                  <span>Nacionalidad</span>
                  <input
                    type="text"
                    value={extras.nationality}
                    onChange={(event) => updateExtra('nationality', event.target.value)}
                    placeholder="Argentina"
                  />
                </label>
                <label>
                  <span>Fecha de nacimiento</span>
                  <input
                    type="date"
                    value={extras.birthDate}
                    onChange={(event) => updateExtra('birthDate', event.target.value)}
                  />
                </label>
                <label>
                  <span>Pais</span>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(event) => updateForm('country', event.target.value)}
                    placeholder="Argentina"
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
