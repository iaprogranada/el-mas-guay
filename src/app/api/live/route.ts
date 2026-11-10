import type { NextRequest } from "next/server";
import { cached, fail, int } from "@/lib/http";
import { getSnapshot } from "@/lib/ranking";

export const runtime = "nodejs";

// Lo que la portada consulta cada pocos segundos: el nº 1, la página que se está viendo y la columna de la derecha.
export async function GET(req: NextRequest) {
  const page = int(req.nextUrl.searchParams.get("pagina"), 1, 1, 10_000_000);
  try {
    return cached(await getSnapshot(page), 2);
  } catch (e) {
    console.error("[live]", e);
    return fail(500, "No hemos podido actualizar el ranking.");
  }
}
