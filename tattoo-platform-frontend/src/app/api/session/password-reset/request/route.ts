import { NextRequest, NextResponse } from 'next/server';
import { toApiErrorResponse } from '@/lib/api-errors';
import { backendFetch } from '@/lib/backend';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email: string };

    const payload = await backendFetch<{ message: string }>(
      '/auth/password-reset/request',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    return toApiErrorResponse(error, 'No pudimos enviar el codigo.');
  }
}
