import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { toApiErrorResponse } from '@/lib/api-errors';
import { backendFetch } from '@/lib/backend';
import { sessionCookieName } from '@/lib/config';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ periodId: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return NextResponse.json({ message: 'Sesion expirada.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { periodId } = await params;
    const payload = await backendFetch(`/metrics/periods/${periodId}/values`, {
      method: 'PUT',
      token,
      body: JSON.stringify(body),
    });

    return NextResponse.json(payload);
  } catch (error) {
    return toApiErrorResponse(error, 'No pudimos guardar las metricas.');
  }
}
