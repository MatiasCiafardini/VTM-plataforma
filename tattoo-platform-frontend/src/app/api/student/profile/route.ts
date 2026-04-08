import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/backend';
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
    const message =
      error instanceof Error ? error.message : 'No pudimos cargar tu perfil.';
    return NextResponse.json({ message }, { status: 400 });
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

    const isProduction = process.env.NODE_ENV === 'production';
    cookieStore.set(
      nameCookieName,
      `${profile.user.firstName} ${profile.user.lastName}`.trim(),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
        path: '/',
        maxAge: 60 * 60 * 8,
      },
    );

    return NextResponse.json(profile);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No pudimos guardar tu perfil.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
