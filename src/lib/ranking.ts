import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "./supabase";
import type { Plan } from "./pricing";
import type { Me, SearchHit, Snapshot } from "./types";

/* ------------------------------ Lectura ------------------------------ */

export async function getSnapshot(page: number): Promise<Snapshot> {
  const { data, error } = await db().rpc("live_snapshot", { p_page: page });
  if (error) throw error;
  return data as Snapshot;
}

export async function getMe(id: string): Promise<Me | null> {
  const { data, error } = await db().rpc("player_position", { p_id: id });
  if (error) throw error;
  return (data as Me | null) ?? null;
}

export async function searchPlayers(key: string): Promise<SearchHit[]> {
  // Escapa los comodines de LIKE para que "_" o "%" se busquen literalmente.
  const q = key.replace(/[\\%_]/g, (c) => "\\" + c);
  const { data, error } = await db().rpc("search_players", { p_q: q });
  if (error) throw error;
  return (data as SearchHit[]) ?? [];
}

/* ------------------------------ Coronar ------------------------------ */

export async function crownOrder(orderId: string, plan: Plan, photoUrl: string | null, email: string | null): Promise<string> {
  const { data, error } = await db().rpc("crown_order", { p_order: orderId, p_plan: plan, p_photo_url: photoUrl, p_email: email });
  if (error) throw error;
  return String(data);
}

export async function cancelOrder(id: string): Promise<void> {
  const { error } = await db().rpc("cancel_order", { p_id: id });
  if (error) throw error;
}

/* ------------------------------ Claves de perfil ------------------------------ */

// Cada perfil tiene una clave secreta que solo guarda el navegador de su dueño. En la base de datos va su huella.
export function newToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenMatches(token: string, hash: string): boolean {
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ------------------------------ Límite de intentos ------------------------------ */

// true si esta IP aún puede hacer esta acción (cada acción lleva su propio contador).
export async function rateAllowed(bucket: string, ip: string, max: number, windowSeconds: number): Promise<boolean> {
  const salt = process.env.RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "guay";
  const key = createHash("sha256").update(salt + ":" + bucket + ":" + ip).digest("hex").slice(0, 32);
  const { data, error } = await db().rpc("rate_check", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) {
    console.error("[rate] error comprobando el límite:", error.message);
    return true; // si falla el contador, no bloqueamos a nadie
  }
  return Boolean(data);
}
