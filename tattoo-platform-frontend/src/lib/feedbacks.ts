export type FeedbackItem = {
  id: string;
  studentId: string;
  weekStart: string;
  createdAt: string;
  rating: number;
  feedback: string;
  achievement: string;
  version: number;
  student: { user: { firstName: string; lastName: string; email: string } };
};

export type FeedbackList = {
  items: FeedbackItem[];
  total: number;
  page: number;
  pageSize: number;
};

export async function feedbackRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (options.signal?.aborted) cancel();
  options.signal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
    if (response.status === 401)
      throw new Error(
        "Tu sesión expiró. Iniciá sesión nuevamente para continuar.",
      );
    const payload = (await response.json().catch(() => null)) as {
      message?: unknown;
    } | null;
    if (!response.ok || !payload) {
      throw new Error(
        typeof payload?.message === "string"
          ? payload.message
          : "No pudimos completar la solicitud. Intentá nuevamente.",
      );
    }
    return payload as T;
  } catch (error) {
    if (
      error instanceof TypeError ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      throw new Error(
        "No pudimos confirmar la respuesta del servidor. Revisá tu conexión y volvé a intentar.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", cancel);
  }
}

export function feedbackDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
