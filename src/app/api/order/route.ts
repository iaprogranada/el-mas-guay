import { NextResponse, type NextRequest } from "next/server";
import { fail, UUID_RE } from "@/lib/http";
import { crownIfPaid, loadOrder, type OrderRow } from "@/lib/orders";
import { cancelOrder } from "@/lib/ranking";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Si el pago ya está hecho pero el aviso de Stripe no ha llegado, lo comprobamos y coronamos.
async function crownIfAlreadyPaid(order: OrderRow): Promise<string | null> {
  if (order.status === "paid" || order.provider !== "stripe" || !order.provider_ref) return null;
  try {
    const session = await stripe().checkout.sessions.retrieve(order.provider_ref);
    return await crownIfPaid(session);
  } catch (e) {
    console.error("[pedido] error consultando Stripe:", e);
    return null;
  }
}

// Estado de un pedido al volver del pago.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!UUID_RE.test(id)) return fail(400, "Pedido no válido.");
  const order = await loadOrder(id).catch(() => null);
  if (!order) return fail(404, "No encontramos ese pedido.");
  const playerId = (await crownIfAlreadyPaid(order)) ?? order.crowned_player;
  const status = playerId ? "paid" : order.status;
  return NextResponse.json({ status, playerId }, { headers: { "Cache-Control": "no-store" } });
}

// Anula un pedido que no se va a pagar (pago cancelado o se cerró la ventana).
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!UUID_RE.test(id)) return fail(400, "Pedido no válido.");
  const order = await loadOrder(id).catch(() => null);
  if (!order) return fail(404, "No encontramos ese pedido.");
  if (order.status !== "pending") return NextResponse.json({ status: order.status, playerId: order.crowned_player });

  // Cerramos el pago de Stripe para que no se pueda completar después; si ya estaba pagado, se corona.
  if (order.provider === "stripe" && order.provider_ref) {
    try {
      await stripe().checkout.sessions.expire(order.provider_ref);
    } catch {
      const playerId = await crownIfAlreadyPaid(order);
      if (playerId) return NextResponse.json({ status: "paid", playerId });
    }
  }
  await cancelOrder(order.id);
  return NextResponse.json({ status: "cancelled", playerId: null }, { headers: { "Cache-Control": "no-store" } });
}
