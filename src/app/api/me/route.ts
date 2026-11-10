import { NextResponse, type NextRequest } from "next/server";
import { fail, UUID_RE } from "@/lib/http";
import { getMe } from "@/lib/ranking";

export const runtime = "nodejs";

// "Tu puesto": el perfil guardado en este navegador, con su puesto actual.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!UUID_RE.test(id)) return fail(400, "Perfil no válido.");
  try {
    const me = await getMe(id);
    if (!me) return fail(404, "Ese perfil ya no está en el ranking.");
    return NextResponse.json(me, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[yo]", e);
    return fail(500, "No hemos podido cargar tu puesto.");
  }
}
