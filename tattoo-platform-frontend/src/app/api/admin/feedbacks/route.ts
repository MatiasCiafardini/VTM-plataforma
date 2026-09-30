import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";
import { toApiErrorResponse } from "@/lib/api-errors";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ message: "Sesión expirada." }, { status: 401 });
  if (session.role !== "ADMIN")
    return NextResponse.json(
      { message: "Acceso restringido." },
      { status: 403 },
    );
  try {
    return NextResponse.json(
      await backendFetch(
        `/feedbacks?${request.nextUrl.searchParams.toString()}`,
        { token: session.token },
      ),
    );
  } catch (error) {
    return toApiErrorResponse(error, "No pudimos cargar los feedbacks.");
  }
}
