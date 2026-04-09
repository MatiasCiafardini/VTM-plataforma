import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { toApiErrorResponse } from '@/lib/api-errors';
import { backendFetch } from '@/lib/backend';
import { sessionCookieName } from '@/lib/config';

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return NextResponse.json({ message: 'Sesion expirada.' }, { status: 401 });
  }

  try {
    const { notificationId } = await params;
    const payload = await backendFetch(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
      token,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return toApiErrorResponse(error, 'No pudimos actualizar la notificacion.');
  }
}
