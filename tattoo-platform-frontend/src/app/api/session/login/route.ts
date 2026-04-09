import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/backend';
import { shouldUseSecureCookies } from '@/lib/auth-cookies';
import {
  nameCookieName,
  roleCookieName,
  sessionCookieName,
} from '@/lib/config';

type LoginResponse = {
  accessToken: string;
  user: {
    firstName: string;
    lastName: string;
    role: 'ADMIN' | 'MENTOR' | 'STUDENT';
  };
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email: string;
      password: string;
    };

    const payload = await backendFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const cookieStore = await cookies();
    const secureCookies = shouldUseSecureCookies(request);

    cookieStore.set(sessionCookieName, payload.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: secureCookies,
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    cookieStore.set(roleCookieName, payload.user.role, {
      httpOnly: true,
      sameSite: 'lax',
      secure: secureCookies,
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    cookieStore.set(
      nameCookieName,
      `${payload.user.firstName} ${payload.user.lastName}`,
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: secureCookies,
        path: '/',
        maxAge: 60 * 60 * 8,
      },
    );

    return NextResponse.json({
      role: payload.user.role,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No pudimos iniciar sesion.';

    return NextResponse.json({ message }, { status: 401 });
  }
}
