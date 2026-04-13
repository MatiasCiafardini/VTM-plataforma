import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { toApiErrorResponse } from '@/lib/api-errors';
import { shouldUseSecureCookies } from '@/lib/auth-cookies';
import { backendFetch } from '@/lib/backend';
import {
  nameCookieName,
  roleCookieName,
  sessionCookieName,
} from '@/lib/config';

type RegisterResponse = {
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
      firstName: string;
      lastName: string;
      country: string;
      accessCode: string;
    };

    const payload = await backendFetch<RegisterResponse>('/auth/register', {
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
      nextPath: payload.user.role === 'STUDENT' ? '/student/onboarding' : undefined,
    });
  } catch (error) {
    return toApiErrorResponse(error, 'No pudimos crear la cuenta.');
  }
}
