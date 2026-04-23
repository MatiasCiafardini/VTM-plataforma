import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { toApiErrorResponse } from '@/lib/api-errors';
import { backendFetch } from '@/lib/backend';
import { sessionCookieName } from '@/lib/config';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ studentChallengeId: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return NextResponse.json({ message: 'Sesion expirada.' }, { status: 401 });
  }

  try {
    const { studentChallengeId } = await params;
    const payload = await backendFetch(
      `/challenges/student-challenges/${studentChallengeId}`,
      {
        method: 'DELETE',
        token,
      },
    );
    return NextResponse.json(payload);
  } catch (error) {
    return toApiErrorResponse(error, 'No pudimos eliminar el logro manual.');
  }
}
