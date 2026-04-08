import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AppRole } from '@/lib/session';
import { LogoutButton } from './logout-button';
import { NotificationBell } from './notification-bell';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

type AppShellProps = {
  title: ReactNode;
  subtitle: ReactNode;
  role: AppRole;
  displayName: string;
  activeNav?: 'dashboard' | 'results' | 'challenges' | 'profile' | 'settings';
  showSectionEyebrow?: boolean;
  notifications?: NotificationItem[];
  children: ReactNode;
};

const roleLabels: Record<AppRole, string> = {
  ADMIN: 'Admin',
  MENTOR: 'Mentor',
  STUDENT: 'Alumno',
};

export function AppShell({
  title,
  subtitle,
  role,
  displayName,
  activeNav = 'dashboard',
  showSectionEyebrow = true,
  notifications = [],
  children,
}: AppShellProps) {
  const dashboardPath =
    role === 'ADMIN' ? '/admin' : role === 'MENTOR' ? '/mentor' : '/student';
  const shouldShowHeader = showSectionEyebrow || Boolean(title) || Boolean(subtitle);

  const navItems =
    role === 'STUDENT'
      ? [
          { key: 'dashboard', label: 'Dashboard', href: `${dashboardPath}?tab=dashboard` },
          { key: 'results', label: 'Resultados', href: `${dashboardPath}?tab=results` },
          { key: 'challenges', label: 'Desafios', href: `${dashboardPath}?tab=challenges` },
          { key: 'profile', label: 'Mi perfil', href: `${dashboardPath}?tab=profile` },
        ]
      : role === 'ADMIN'
        ? [
            { key: 'dashboard', label: 'Dashboard', href: `${dashboardPath}?tab=dashboard` },
            {
              key: 'results',
              label: 'Gestion de Alumnos',
              href: `${dashboardPath}?tab=results`,
            },
            {
              key: 'challenges',
              label: 'Muro de Logros',
              href: `${dashboardPath}?tab=challenges`,
            },
            {
              key: 'settings',
              label: 'Configuracion',
              href: `${dashboardPath}?tab=settings`,
            },
          ]
      : role === 'MENTOR'
        ? [
            { key: 'dashboard', label: 'Dashboard', href: `${dashboardPath}?tab=dashboard` },
            { key: 'results', label: 'Gestion de Alumnos', href: `${dashboardPath}?tab=results` },
            { key: 'challenges', label: 'Muro de Alertas', href: `${dashboardPath}?tab=challenges` },
            { key: 'profile', label: 'Equipo', href: `${dashboardPath}?tab=profile` },
          ]
      : [
          { key: 'dashboard', label: 'Dashboard', href: `${dashboardPath}?tab=dashboard` },
          { key: 'results', label: 'Resultados', href: `${dashboardPath}?tab=results` },
          { key: 'challenges', label: 'Alertas', href: `${dashboardPath}?tab=challenges` },
          { key: 'profile', label: 'Equipo', href: `${dashboardPath}?tab=profile` },
        ];

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-dot">V</span>
          <div className="brand-copy">
            <strong>VMT Studio</strong>
            <p>Growth dashboard</p>
          </div>
        </div>

        {role === 'ADMIN' || role === 'STUDENT' ? (
          <nav className="topbar-center-nav topbar-nav topbar-nav-centered">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                prefetch
                scroll={false}
                className={activeNav === item.key ? 'nav-item nav-item-active' : 'nav-item'}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <div className="topbar-actions">
          {role === 'ADMIN' ? (
            <>
              <NotificationBell notifications={notifications} role={role} />
              <Link
                href={`${dashboardPath}?tab=profile`}
                prefetch
                scroll={false}
                className={activeNav === 'profile' ? 'profile-circle profile-circle-active' : 'profile-circle'}
                aria-label={`Perfil de ${displayName}`}
                title={displayName}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="8" r="4" />
                </svg>
              </Link>
              <LogoutButton iconOnly />
            </>
          ) : role === 'STUDENT' ? (
            <>
              <NotificationBell notifications={notifications} role={role} />
              <Link
                href={`${dashboardPath}?tab=profile`}
                prefetch
                scroll={false}
                className={activeNav === 'profile' ? 'profile-circle profile-circle-active' : 'profile-circle'}
                aria-label={`Perfil de ${displayName}`}
                title={displayName}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="8" r="4" />
                </svg>
              </Link>
              <LogoutButton iconOnly />
            </>
          ) : (
            <>
              <nav className="topbar-nav">
                {navItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    prefetch
                    scroll={false}
                    className={activeNav === item.key ? 'nav-item nav-item-active' : 'nav-item'}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="topbar-user-cluster">
                <NotificationBell notifications={notifications} role={role} />
                <div className="topbar-user-meta">
                  <span className="role-pill">{roleLabels[role]}</span>
                  <p className="topbar-user">{displayName}</p>
                </div>
                <LogoutButton />
              </div>
            </>
          )}
        </div>
      </header>

      <main className="main-panel shell-main">
        {shouldShowHeader ? (
          <header className="main-header">
            <div>
              {showSectionEyebrow ? (
                <p className="eyebrow">
                  {role === 'ADMIN'
                    ? 'Control central'
                    : role === 'MENTOR'
                      ? 'Seguimiento activo'
                      : 'Panel personal'}
                </p>
              ) : null}
              {title ? <h2>{title}</h2> : null}
              {subtitle ? <p className="main-subtitle">{subtitle}</p> : null}
            </div>
          </header>
        ) : null}

        {children}
      </main>
    </div>
  );
}
