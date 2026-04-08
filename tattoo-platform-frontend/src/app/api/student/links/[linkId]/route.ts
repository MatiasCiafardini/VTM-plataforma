import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/backend';
import { sessionCookieName } from '@/lib/config';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ linkId: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return NextResponse.json({ message: 'Sesion expirada.' }, { status: 401 });
  }

  try {
    const { linkId } = await params;
    await backendFetch(`/student-links/me/${linkId}`, {
      method: 'DELETE',
      token,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No pudimos eliminar el link.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
