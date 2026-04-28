import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  nameCookieName,
  roleCookieName,
  sessionCookieName,
} from './config';

export type AppRole = 'ADMIN' | 'MENTOR' | 'STUDENT';

export type Session = {
  token: string;
  role: AppRole;
  displayName: string;
};

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const role = cookieStore.get(roleCookieName)?.value as AppRole | undefined;
  const displayName = cookieStore.get(nameCookieName)?.value ?? 'Usuario';

  if (!token || !role) {
    return null;
  }

  return {
    token,
    role,
    displayName,
  };
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return session;
}

export async function requireRole(role: AppRole) {
  const session = await requireSession();

  if (session.role !== role) {
    redirect(getDashboardPath(session.role));
  }

  return session;
}

export async function requireAnyRole(roles: AppRole[]) {
  const session = await requireSession();

  if (!roles.includes(session.role)) {
    redirect(getDashboardPath(session.role));
  }

  return session;
}

export function getDashboardPath(role: AppRole) {
  if (role === 'ADMIN') {
    return '/admin';
  }

  if (role === 'MENTOR') {
    return '/mentor';
  }

  return '/student';
}
