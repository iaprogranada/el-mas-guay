import "server-only";
import Stripe from "stripe";
import { env, siteUrl } from "./env";
import { PLANS, type Plan } from "./pricing";

let client: Stripe | null = null;
export function stripe(): Stripe {
  if (!client) {
    // STRIPE_API_BASE solo sirve para pruebas en local contra un simulador (por ejemplo, stripe-mock).
    const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null;
    client = new Stripe(
      env("STRIPE_SECRET_KEY"),
      base
        ? { host: base.hostname, port: Number(base.port || 80), protocol: base.protocol === "http:" ? "http" : "https" }
        : undefined,
    );
  }
  return client;
}

// Crea el pago en Stripe Checkout (tarjeta, Apple Pay, Google Pay…) y devuelve la URL de pago.
// `attempt` cambia cada vez que se abre un pago nuevo para el mismo pedido (si no, Stripe devolvería el anterior).
export async function createStripeCheckout(orderId: string, plan: Plan, attempt: string): Promise<{ id: string; url: string }> {
  const p = PLANS[plan];
  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      locale: "es",
      client_reference_id: orderId,
      metadata: { order_id: orderId, plan },
      payment_intent_data: { metadata: { order_id: orderId, plan }, description: "El Más Guay del Mundo" },
      line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: p.cents, product_data: { name: p.label } } }],
      success_url: `${siteUrl()}/?pago=ok&pedido=${orderId}`,
      cancel_url: `${siteUrl()}/?pago=cancelado&pedido=${orderId}`,
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    },
    { idempotencyKey: `checkout-${orderId}-${plan}-${attempt}` },
  );
  if (!session.url) throw new Error("Stripe no devolvió URL de pago");
  return { id: session.id, url: session.url };
}

// El plan que se pagó de verdad, o null si el pago no cuadra con lo que vendemos.
export function paidPlan(session: Stripe.Checkout.Session): Plan | null {
  if (session.payment_status !== "paid" || session.currency !== "eur") return null;
  const plan = session.metadata?.plan;
  if (plan !== "one" && plan !== "pack") return null;
  return session.amount_total === PLANS[plan].cents ? plan : null;
}
