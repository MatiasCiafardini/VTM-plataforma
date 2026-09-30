import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";
import { toApiErrorResponse } from "@/lib/api-errors";
import { getSession } from "@/lib/session";

type Context = { params: Promise<{ feedbackId: string }> };

async function proxy(
  request: NextRequest,
  context: Context,
  method: "GET" | "PATCH",
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ message: "Sesión expirada." }, { status: 401 });
  if (session.role !== "ADMIN")
    return NextResponse.json(
      { message: "Acceso restringido." },
      { status: 403 },
    );
  try {
    const { feedbackId } = await context.params;
    const body: unknown = method === "PATCH" ? await request.json() : undefined;
    return NextResponse.json(
      await backendFetch(`/feedbacks/${encodeURIComponent(feedbackId)}`, {
        method,
        token: session.token,
        ...(method === "PATCH" ? { body: JSON.stringify(body) } : {}),
      }),
    );
  } catch (error) {
    return toApiErrorResponse(
      error,
      "No pudimos cargar o guardar este feedback.",
    );
  }
}

export const GET = (request: NextRequest, context: Context) =>
  proxy(request, context, "GET");
export const PATCH = (request: NextRequest, context: Context) =>
  proxy(request, context, "PATCH");
