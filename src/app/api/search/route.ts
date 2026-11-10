import type { NextRequest } from "next/server";
import { cached, fail } from "@/lib/http";
import { searchPlayers } from "@/lib/ranking";
import { LIMITS, nameKey } from "@/lib/validation";

export const runtime = "nodejs";

// Buscador: personas cuyo nombre contiene el texto, con su puesto.
export async function GET(req: NextRequest) {
  const key = nameKey(req.nextUrl.searchParams.get("q") ?? "").slice(0, LIMITS.nameMax);
  if (!key) return cached([], 60);
  try {
    return cached(await searchPlayers(key), 3);
  } catch (e) {
    console.error("[buscar]", e);
    return fail(500, "No hemos podido buscar ahora mismo.");
  }
}
