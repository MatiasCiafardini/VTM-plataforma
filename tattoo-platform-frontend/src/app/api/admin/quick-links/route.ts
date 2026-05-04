import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { toApiErrorResponse } from '@/lib/api-errors';
import { backendFetch } from '@/lib/backend';
import { sessionCookieName } from '@/lib/config';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return NextResponse.json({ message: 'Sesion expirada.' }, { status: 401 });
  }

  try {
    const links = await backendFetch('/users/me/quick-links', { token });
    return NextResponse.json(links);
  } catch (error) {
    return toApiErrorResponse(error, 'No pudimos cargar tus links.');
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return NextResponse.json({ message: 'Sesion expirada.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const created = await backendFetch('/users/me/quick-links', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    });

    return NextResponse.json(created);
  } catch (error) {
    return toApiErrorResponse(error, 'No pudimos crear el link.');
  }
}
