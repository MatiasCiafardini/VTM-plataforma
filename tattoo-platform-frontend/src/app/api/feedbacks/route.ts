import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";
import { toApiErrorResponse } from "@/lib/api-errors";
import { getSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ message: "Sesión expirada." }, { status: 401 });
  if (session.role !== "STUDENT")
    return NextResponse.json(
      { message: "Solo los alumnos pueden enviar feedback." },
      { status: 403 },
    );
  try {
    const body: unknown = await request.json();
    return NextResponse.json(
      await backendFetch("/feedbacks", {
        method: "POST",
        token: session.token,
        body: JSON.stringify(body),
      }),
    );
  } catch (error) {
    return toApiErrorResponse(error, "No pudimos enviar tu feedback.");
  }
}
