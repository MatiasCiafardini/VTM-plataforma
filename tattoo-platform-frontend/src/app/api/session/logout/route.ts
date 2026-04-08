import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  nameCookieName,
  roleCookieName,
  sessionCookieName,
} from '@/lib/config';

export async function POST() {
  const cookieStore = await cookies();

  cookieStore.delete(sessionCookieName);
  cookieStore.delete(roleCookieName);
  cookieStore.delete(nameCookieName);

  return NextResponse.json({ success: true });
}
