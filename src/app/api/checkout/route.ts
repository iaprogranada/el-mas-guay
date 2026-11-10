import { NextResponse, type NextRequest } from "next/server";
import { clientIp, fail, UUID_RE } from "@/lib/http";
import { crownIfPaid, loadOrder } from "@/lib/orders";
import { isPlan, PLANS } from "@/lib/pricing";
import { rateAllowed } from "@/lib/ranking";
import { createStripeCheckout, stripe } from "@/lib/stripe";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";

// Paso 2: abre el pago de Stripe para un pedido que ya pasó el filtro.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { orderId?: string; plan?: string };
  const id = String(body.orderId ?? "");
  if (!UUID_RE.test(id)) return fail(400, "Falta el pedido.");
  if (!isPlan(body.plan)) return fail(400, "Elige qué quieres comprar.");
  const plan = body.plan;

  if (!(await rateAllowed("checkout", clientIp(req), 20, 600))) {
    return fail(429, "Has hecho muchos intentos seguidos. Espera unos minutos y vuelve a probar.");
  }

  const order = await loadOrder(id).catch(() => null);
  if (!order) return fail(404, "No encontramos tu pedido. Vuelve a empezar.");
  if (order.status === "paid") return NextResponse.json({ status: "paid", playerId: order.crowned_player });
  if (order.status !== "pending" || order.provider === "credit") return fail(409, "Este pedido ya no está pendiente. Vuelve a empezar.");
  if (Date.now() - new Date(order.created_at).getTime() > 40 * 60_000) {
    return fail(410, "Ha pasado demasiado tiempo. Vuelve a empezar, que es un momento.");
  }

  try {
    // Si ya había un pago abierto (por ejemplo, volvió atrás y cambió de opción), se cierra antes de abrir otro.
    if (order.provider_ref) {
      const prev = await stripe().checkout.sessions.retrieve(order.provider_ref);
      if (prev.status === "complete") {
        const playerId = await crownIfPaid(prev);
        if (playerId) return NextResponse.json({ status: "paid", playerId });
      }
      if (prev.status === "open") await stripe().checkout.sessions.expire(prev.id).catch(() => undefined);
    }
    const session = await createStripeCheckout(order.id, plan, order.provider_ref ?? "first");
    await db()
      .from("orders")
      .update({ provider: "stripe", provider_ref: session.id, plan, amount_cents: PLANS[plan].cents })
      .eq("id", order.id);
    return NextResponse.json({ url: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[checkout] error creando el pago:", e);
    return fail(502, "No hemos podido abrir el pago. Inténtalo de nuevo en un momento.");
  }
}
