import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { toApiErrorResponse } from '@/lib/api-errors';
import { backendFetch } from '@/lib/backend';
import { sessionCookieName } from '@/lib/config';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return NextResponse.json({ message: 'Sesion expirada.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const query = new URLSearchParams();

    if (month) {
      query.set('month', month);
    }

    if (year) {
      query.set('year', year);
    }

    const payload = await backendFetch(
      `/metrics/periods/me${query.toString() ? `?${query.toString()}` : ''}`,
      {
        token,
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    return toApiErrorResponse(error, 'No pudimos listar los periodos.');
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
    const payload = await backendFetch('/metrics/periods', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    });

    return NextResponse.json(payload);
  } catch (error) {
    return toApiErrorResponse(error, 'No pudimos crear el periodo.');
  }
}
