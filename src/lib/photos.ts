import "server-only";
import { db } from "./supabase";

const BUCKET = "fotos";
const MAX_BYTES = 250_000;

// El navegador recorta la foto a 256×256 y la manda como JPEG. Devuelve el base64 limpio o un error.
export function parsePhoto(dataUrl: unknown): { ok: true; base64: string } | { ok: false; error: string } {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/jpeg;base64,")) {
    return { ok: false, error: "No hemos podido leer tu foto. Prueba con otra." };
  }
  const base64 = dataUrl.slice("data:image/jpeg;base64,".length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return { ok: false, error: "No hemos podido leer tu foto. Prueba con otra." };
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > MAX_BYTES) return { ok: false, error: "La foto pesa demasiado. Prueba con otra." };
  if (bytes.length < 200 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    return { ok: false, error: "No hemos podido leer tu foto. Prueba con otra." };
  }
  return { ok: true, base64 };
}

// Sube la foto revisada a Supabase Storage y devuelve su dirección pública.
export async function uploadPhoto(orderId: string, base64: string): Promise<string> {
  const path = `p/${orderId}.jpg`;
  const { error } = await db()
    .storage.from(BUCKET)
    .upload(path, Buffer.from(base64, "base64"), { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
  if (error) throw error;
  return db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
