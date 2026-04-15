import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { toApiErrorResponse } from '@/lib/api-errors';
import { backendFetch } from '@/lib/backend';
import { sessionCookieName } from '@/lib/config';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ phaseId: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return NextResponse.json({ message: 'Sesion expirada.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { phaseId } = await params;
    const payload = await backendFetch(`/onboarding/admin/phases/${phaseId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    });
    return NextResponse.json(payload);
  } catch (error) {
    return toApiErrorResponse(error, 'No pudimos actualizar la fase de onboarding.');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ phaseId: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return NextResponse.json({ message: 'Sesion expirada.' }, { status: 401 });
  }

  try {
    const { phaseId } = await params;
    const payload = await backendFetch(`/onboarding/admin/phases/${phaseId}`, {
      method: 'DELETE',
      token,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return toApiErrorResponse(error, 'No pudimos eliminar la fase de onboarding.');
  }
}
