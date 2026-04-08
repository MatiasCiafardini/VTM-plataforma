import { backendApiUrl } from './config';

type FetchOptions = RequestInit & {
  token?: string;
};

export async function backendFetch<T>(
  path: string,
  { token, headers, ...init }: FetchOptions = {},
): Promise<T> {
  const response = await fetch(`${backendApiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    let message = 'No pudimos completar la solicitud al backend.';

    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(payload.message)) {
        message = payload.message.join(', ');
      } else if (payload.message) {
        message = payload.message;
      }
    } catch {
      const text = await response.text();
      if (text) {
        message = text;
      }
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}
