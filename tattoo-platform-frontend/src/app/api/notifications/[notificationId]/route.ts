import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/backend';
import { sessionCookieName } from '@/lib/config';

export async function DELETE(
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
    const payload = await backendFetch(`/notifications/${notificationId}`, {
      method: 'DELETE',
      token,
    });
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No pudimos eliminar la notificacion.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
