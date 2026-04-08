import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/backend';
import { sessionCookieName } from '@/lib/config';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return NextResponse.json({ message: 'Sesion expirada.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { challengeId } = await params;
    const payload = await backendFetch(`/challenges/${challengeId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    });
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No pudimos actualizar el desafio.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
