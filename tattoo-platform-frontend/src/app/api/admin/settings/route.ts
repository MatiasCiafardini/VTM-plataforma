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
    const payload = await backendFetch('/admin-settings', { token });
    return NextResponse.json(payload);
  } catch (error) {
    return toApiErrorResponse(error, 'No pudimos listar la configuracion.');
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
    const payload = await backendFetch('/admin-settings', {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    });
    return NextResponse.json(payload);
  } catch (error) {
    return toApiErrorResponse(error, 'No pudimos guardar la configuracion.');
  }
}
