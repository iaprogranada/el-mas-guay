import { NextResponse, type NextRequest } from "next/server";
import { clientIp, fail, UUID_RE } from "@/lib/http";
import { crownOrder, getMe, rateAllowed, tokenMatches } from "@/lib/ranking";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";

// Usa una coronación guardada del Pack pique: sube al nº 1 al momento, sin pagar otra vez.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { playerId?: string; token?: string };
  const id = String(body.playerId ?? "");
  if (!UUID_RE.test(id) || typeof body.token !== "string") return fail(400, "Perfil no válido.");

  if (!(await rateAllowed("credit", clientIp(req), 20, 600))) {
    return fail(429, "Has hecho muchos intentos seguidos. Espera unos minutos y vuelve a probar.");
  }

  const { data: p, error } = await db()
    .from("players")
    .select("id, name, name_key, link, emoji, hue, credits, token_hash")
    .eq("id", id)
    .maybeSingle();
  if (error) return fail(500, "No hemos podido comprobar tu perfil. Inténtalo de nuevo.");
  if (!p) return fail(404, "Ese perfil ya no está en el ranking.");
  if (!tokenMatches(body.token, p.token_hash)) return fail(403, "No hemos podido reconocer tu perfil en este navegador.");
  if (p.credits < 1) return fail(409, "Ya no te quedan coronaciones guardadas.");
  const me = await getMe(id);
  if (me?.pos === 1) return fail(409, "Ya eres el más guay del mundo.");

  const { data: order, error: orderError } = await db()
    .from("orders")
    .insert({
      player_id: p.id,
      name: p.name,
      name_key: p.name_key,
      link: p.link,
      emoji: p.emoji,
      hue: p.hue,
      keep_photo: true,
      token_hash: p.token_hash,
      plan: "one",
      amount_cents: 0,
      provider: "credit",
    })
    .select("id")
    .single();
  if (orderError || !order) return fail(500, "No hemos podido usar tu coronación. Inténtalo de nuevo.");

  try {
    const playerId = await crownOrder(order.id, "one", null, null);
    return NextResponse.json({ status: "paid", playerId }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[credit] no se pudo coronar:", e);
    return fail(409, "No hemos podido usar tu coronación. Recarga la página y vuelve a intentarlo.");
  }
}
