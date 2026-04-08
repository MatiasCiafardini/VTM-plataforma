import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/backend';
import { sessionCookieName } from '@/lib/config';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return NextResponse.json({ message: 'Sesion expirada.' }, { status: 401 });
  }

  try {
    const links = await backendFetch('/student-links/me', { token });
    return NextResponse.json(links);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No pudimos cargar tus links.';
    return NextResponse.json({ message }, { status: 400 });
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
    const created = await backendFetch('/student-links/me', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    });

    return NextResponse.json(created);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No pudimos crear el link.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
