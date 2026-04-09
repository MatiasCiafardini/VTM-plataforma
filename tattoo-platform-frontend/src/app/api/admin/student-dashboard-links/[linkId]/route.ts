import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { toApiErrorResponse } from '@/lib/api-errors';
import { backendFetch } from '@/lib/backend';
import { sessionCookieName } from '@/lib/config';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return NextResponse.json({ message: 'Sesion expirada.' }, { status: 401 });
  }

  try {
    const { linkId } = await params;
    const payload = await backendFetch(`/student-dashboard-links/${linkId}`, {
      method: 'DELETE',
      token,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return toApiErrorResponse(error, 'No pudimos eliminar el acceso.');
  }
}
