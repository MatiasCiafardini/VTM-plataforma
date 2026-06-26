import { NextRequest, NextResponse } from 'next/server';
import { toApiErrorResponse } from '@/lib/api-errors';
import { backendFetch } from '@/lib/backend';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email: string;
      code: string;
    };

    const payload = await backendFetch<{ valid: boolean }>(
      '/auth/password-reset/verify',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );

    return NextResponse.json(payload);
  } catch (error) {
    return toApiErrorResponse(error, 'El codigo no es valido o ya vencio.');
  }
}
