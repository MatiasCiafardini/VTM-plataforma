import { NextResponse } from 'next/server';
import { BackendFetchError } from './backend';

export function toApiErrorResponse(
  error: unknown,
  fallbackMessage: string,
) {
  if (error instanceof BackendFetchError) {
    return NextResponse.json(
      { message: error.message || fallbackMessage },
      { status: error.status },
    );
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  return NextResponse.json({ message }, { status: 500 });
}
