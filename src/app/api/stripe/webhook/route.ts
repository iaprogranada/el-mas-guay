import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { crownIfPaid, loadOrder } from "@/lib/orders";
import { cancelOrder } from "@/lib/ranking";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Avisos de Stripe: corona a la persona cuando el pago se completa.
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature ?? "", env("STRIPE_WEBHOOK_SECRET"));
  } catch (e) {
    console.error("[stripe] firma no válida:", (e as Error).message);
    return NextResponse.json({ error: "firma no válida" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await crownIfPaid(event.data.object);
        break;
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const session = event.data.object;
        const id = session.metadata?.order_id;
        // Solo se anula si es el pago vigente del pedido (no uno anterior que se cerró al cambiar de opción).
        const order = id ? await loadOrder(id) : null;
        if (order && order.status === "pending" && order.provider_ref === session.id) await cancelOrder(order.id);
        break;
      }
    }
  } catch (e) {
    console.error(`[stripe] error procesando ${event.type}:`, e);
    return NextResponse.json({ error: "reintentar" }, { status: 500 }); // Stripe lo reintentará
  }
  return NextResponse.json({ received: true });
}
