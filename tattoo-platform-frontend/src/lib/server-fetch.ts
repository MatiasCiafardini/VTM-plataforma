import { backendFetch, type FetchOptions } from './backend';

export async function safeBackendFetch<T>(
  path: string,
  fallback: T,
  options: FetchOptions = {},
  context?: string,
): Promise<T> {
  try {
    return await backendFetch<T>(path, options);
  } catch (error) {
    console.error(
      `safeBackendFetch fallback for ${context ?? path}`,
      error instanceof Error ? error.message : error,
    );
    return fallback;
  }
}
