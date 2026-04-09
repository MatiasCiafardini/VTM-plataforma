import type { NextRequest } from 'next/server';

export function shouldUseSecureCookies(request?: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    return false;
  }

  if (!request) {
    return false;
  }

  const forwardedProto = request.headers.get('x-forwarded-proto');

  if (forwardedProto) {
    return forwardedProto === 'https';
  }

  return request.nextUrl.protocol === 'https:';
}
