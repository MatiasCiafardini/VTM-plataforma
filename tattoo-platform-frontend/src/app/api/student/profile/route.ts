import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { toApiErrorResponse } from '@/lib/api-errors';
import { backendFetch } from '@/lib/backend';
import { shouldUseSecureCookies } from '@/lib/auth-cookies';
import { nameCookieName, sessionCookieName } from '@/lib/config';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return NextResponse.json({ message: 'Sesion expirada.' }, { status: 401 });
  }

  try {
    const profile = await backendFetch('/students/me', { token });
    return NextResponse.json(profile);
  } catch (error) {
    return toApiErrorResponse(error, 'No pudimos cargar tu perfil.');
  }
}

export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return NextResponse.json({ message: 'Sesion expirada.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const profile = await backendFetch<{
      user: {
        firstName: string;
        lastName: string;
      };
    }>('/students/me', {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    });

    const secureCookies = shouldUseSecureCookies(request);
    cookieStore.set(
      nameCookieName,
      `${profile.user.firstName} ${profile.user.lastName}`.trim(),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: secureCookies,
        path: '/',
        maxAge: 60 * 60 * 8,
      },
    );

    return NextResponse.json(profile);
  } catch (error) {
    return toApiErrorResponse(error, 'No pudimos guardar tu perfil.');
  }
}
