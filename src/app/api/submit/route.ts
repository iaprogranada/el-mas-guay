import { NextResponse, type NextRequest } from "next/server";
import { moderate, type Field } from "@/lib/ai";
import { clientIp, UUID_RE } from "@/lib/http";
import { parsePhoto } from "@/lib/photos";
import { getMe, hashToken, newToken, rateAllowed, tokenMatches } from "@/lib/ranking";
import { db } from "@/lib/supabase";
import {
  ALLOWED_EMOJIS,
  checkName,
  cleanLink,
  linkProblem,
  nameKey,
  nameProblem,
  normalizeName,
  validHue,
} from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

const NOT_CHARGED = "No se te ha cobrado nada.";

function fail(status: number, error: string, field: Field = null) {
  return NextResponse.json({ error, field }, { status, headers: { "Cache-Control": "no-store" } });
}

type AvatarIn = { kind?: unknown; hue?: unknown; emoji?: unknown; data?: unknown };

// Paso 1: revisa nombre, enlace y foto con el filtro y deja el pedido listo para pagar.
export async function POST(req: NextRequest) {
  let body: { name?: unknown; link?: unknown; avatar?: AvatarIn; playerId?: unknown; token?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, "No hemos podido leer tus datos. Recarga la página y vuelve a intentarlo.");
  }

  const name = normalizeName(String(body.name ?? ""));
  const key = nameKey(name);
  const nameError = checkName(name);
  if (nameError) return fail(400, nameError, "name");
  const link = cleanLink(String(body.link ?? ""));
  if (link === null) return fail(400, "Ese enlace no parece una web. Prueba algo como instagram.com/tuusuario.", "link");

  const np = nameProblem(name);
  if (np) return fail(422, `Ese nombre no se puede publicar porque ${np}. Cámbialo; ${NOT_CHARGED.toLowerCase()}`, "name");
  const lp = linkProblem(link);
  if (lp) return fail(422, `Ese enlace no se puede publicar: ${lp}. Cámbialo o déjalo vacío; ${NOT_CHARGED.toLowerCase()}`, "link");

  if (!(await rateAllowed("submit", clientIp(req), 12, 600))) {
    return fail(429, "Has hecho muchos intentos seguidos. Espera unos minutos y vuelve a probar.");
  }

  // ¿Es alguien que ya está en el ranking? Lo demuestra con la clave que guarda su navegador.
  const playerId = typeof body.playerId === "string" && UUID_RE.test(body.playerId) ? body.playerId : null;
  let current: { id: string; name: string; link: string | null; photo_url: string | null; emoji: string | null; hue: number; token_hash: string } | null = null;
  if (playerId) {
    const { data, error } = await db()
      .from("players")
      .select("id, name, link, photo_url, emoji, hue, token_hash")
      .eq("id", playerId)
      .maybeSingle();
    if (error) {
      console.error("[submit] no se pudo leer el perfil:", error.message);
      return fail(500, "No hemos podido comprobar tu perfil. Inténtalo de nuevo.");
    }
    if (data) {
      if (typeof body.token !== "string" || !tokenMatches(body.token, data.token_hash)) {
        return fail(403, "No hemos podido reconocer tu perfil en este navegador. Recarga la página y vuelve a intentarlo.");
      }
      current = data;
      const me = await getMe(playerId);
      if (me?.pos === 1) return fail(409, "Ya eres el más guay del mundo. Espera a que alguien te quite el trono.");
    }
  }

  // El nombre es único en el ranking.
  const { data: taken, error: takenError } = await db().from("players").select("id").eq("name_key", key).limit(1);
  if (takenError) {
    console.error("[submit] no se pudo comprobar el nombre:", takenError.message);
    return fail(500, "No hemos podido comprobar tu nombre. Inténtalo de nuevo.");
  }
  if (taken?.length && taken[0].id !== current?.id) {
    return fail(409, "Ese nombre ya lo tiene otra persona del ranking. Elige otro.", "name");
  }

  // Avatar: una foto nueva, la foto que ya tiene, o un avatar de colores (iniciales o emoji).
  const av = body.avatar ?? {};
  let photo: string | null = null;
  let keepPhoto = false;
  let emoji: string | null = null;
  let hue = 250;
  if (av.kind === "photo") {
    const parsed = parsePhoto(av.data);
    if (!parsed.ok) return fail(400, parsed.error, "photo");
    photo = parsed.base64;
  } else if (av.kind === "keep" && current?.photo_url) {
    keepPhoto = true;
    hue = current.hue;
  } else {
    hue = validHue(av.hue) ?? 250;
    emoji = typeof av.emoji === "string" && ALLOWED_EMOJIS.has(av.emoji) ? av.emoji : null;
  }

  // Si vuelve a coronarse sin cambiar nada, ya se revisó la otra vez.
  const unchanged = current !== null && current.name === name && (current.link ?? "") === link && photo === null;
  if (!unchanged) {
    const verdict = await moderate({ name, link, photoBase64: photo });
    if (!verdict.ok) {
      if ("unavailable" in verdict) return fail(503, "Ahora mismo no podemos revisar tu perfil. Inténtalo de nuevo en un minuto.");
      return fail(422, `${verdict.reason} ${NOT_CHARGED}`, verdict.field);
    }
  }

  const token = current ? null : newToken();
  const { data: order, error } = await db()
    .from("orders")
    .insert({
      player_id: current?.id ?? null,
      name,
      name_key: key,
      link: link || null,
      emoji,
      hue,
      photo,
      keep_photo: keepPhoto,
      token_hash: current ? current.token_hash : hashToken(token!),
    })
    .select("id")
    .single();
  if (error || !order) {
    console.error("[submit] no se pudo guardar el pedido:", error?.message);
    return fail(500, "No hemos podido guardar tus datos. Inténtalo de nuevo.");
  }

  return NextResponse.json({ orderId: order.id, token }, { headers: { "Cache-Control": "no-store" } });
}
