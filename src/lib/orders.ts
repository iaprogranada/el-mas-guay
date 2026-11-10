import "server-only";
import type Stripe from "stripe";
import { uploadPhoto } from "./photos";
import type { Plan } from "./pricing";
import { crownOrder } from "./ranking";
import { paidPlan } from "./stripe";
import { db } from "./supabase";

export interface OrderRow {
  id: string;
  status: "pending" | "paid" | "cancelled";
  plan: Plan | null;
  provider: "stripe" | "credit" | null;
  provider_ref: string | null;
  crowned_player: string | null;
  created_at: string;
}

export const ORDER_COLUMNS = "id, status, plan, provider, provider_ref, crowned_player, created_at";

export async function loadOrder(id: string): Promise<OrderRow | null> {
  const { data, error } = await db().from("orders").select(ORDER_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as OrderRow | null) ?? null;
}

// Corona un pedido ya pagado: sube la foto (si la hay) y pone a la persona en el nº 1. Idempotente.
export async function crownPaid(orderId: string, plan: Plan, email: string | null): Promise<string> {
  const { data, error } = await db().from("orders").select("status, crowned_player, photo").eq("id", orderId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`pedido ${orderId} no encontrado`);
  if (data.status === "paid" && data.crowned_player) return data.crowned_player as string;

  let photoUrl: string | null = null;
  if (data.photo) {
    try {
      photoUrl = await uploadPhoto(orderId, data.photo as string);
    } catch (e) {
      // El pago ya está hecho: mejor coronar sin foto que dejar a la persona esperando.
      console.error("[fotos] no se pudo subir la foto del pedido", orderId, e);
    }
  }
  return crownOrder(orderId, plan, photoUrl, email);
}

// Corona si la sesión de Stripe está pagada y cuadra con el pedido. Devuelve el id de la persona o null.
export async function crownIfPaid(session: Stripe.Checkout.Session): Promise<string | null> {
  const orderId = session.metadata?.order_id || session.client_reference_id;
  if (!orderId) return null;
  const plan = paidPlan(session);
  if (!plan) {
    if (session.payment_status === "paid") console.error("[stripe] el pago no cuadra con lo que vendemos", session.id);
    return null;
  }
  return crownPaid(orderId, plan, session.customer_details?.email ?? null);
}
