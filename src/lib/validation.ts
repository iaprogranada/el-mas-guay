// Reglas de forma y filtro rápido de palabras. Las usan el servidor y el navegador.
// El filtro de verdad es la IA (src/lib/ai.ts); esto solo ahorra llamadas y da una respuesta inmediata.

export const LIMITS = { nameMin: 2, nameMax: 30, linkMax: 200 } as const;

/* ------------------------------ Avatares ------------------------------ */

// Los 12 avatares que se pueden elegir sin subir foto. El primero son las iniciales.
export const PRESETS: { hue: number; emoji: string | null }[] = [
  { hue: 250, emoji: null },
  { hue: 30, emoji: "🐵" },
  { hue: 55, emoji: "🍌" },
  { hue: 110, emoji: "🦖" },
  { hue: 280, emoji: "🦄" },
  { hue: 200, emoji: "😎" },
  { hue: 140, emoji: "👽" },
  { hue: 262, emoji: "🎮" },
  { hue: 205, emoji: "🛫" },
  { hue: 0, emoji: "🍿" },
  { hue: 32, emoji: "🧔" },
  { hue: 325, emoji: "👱‍♀️" },
];

export const ALLOWED_EMOJIS = new Set(PRESETS.map((p) => p.emoji).filter((e): e is string => Boolean(e)));

export function validHue(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 359 ? v : null;
}

/* ------------------------------ Nombre ------------------------------ */

export function normalizeName(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u2028-\u202E\u2060-\u206F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Clave para comparar nombres: "Banana Loca" y "banana  locá" son el mismo.
export function nameKey(name: string): string {
  return plain(normalizeName(name)).replace(/\s+/g, " ");
}

export function plain(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function checkName(name: string): string | null {
  if (name.length < LIMITS.nameMin) return `Escribe un nombre de al menos ${LIMITS.nameMin} letras.`;
  if (name.length > LIMITS.nameMax) return `El nombre puede tener como mucho ${LIMITS.nameMax} caracteres.`;
  if (!/^[\p{L}\p{M}\p{N} _.,'’&!¡?¿()\-]+$/u.test(name)) {
    return "El nombre solo puede tener letras, números, espacios y los signos . , - _ ' & ! ? ( )";
  }
  if (!/[\p{L}\p{N}]/u.test(name)) return "El nombre tiene que llevar alguna letra o número.";
  return null;
}

/* ------------------------------ Enlace ------------------------------ */

// Acepta "instagram.com/usuario" o "https://…". Devuelve la URL limpia, "" si está vacío o null si no vale.
export function cleanLink(raw: string): string | null {
  let v = raw.trim();
  if (!v) return "";
  if (v.length > LIMITS.linkMax) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) v = "https://" + v;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.username || u.password) return null;
    const h = u.hostname.toLowerCase();
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(h) && !/^xn--/.test(h)) return null; // sin IPs ni "localhost"
    u.hash = "";
    return u.href.length > LIMITS.linkMax + 10 ? null : u.href;
  } catch {
    return null;
  }
}

export function host(u: string): string {
  try {
    const x = new URL(u);
    return (x.hostname.replace(/^www\./, "") + x.pathname).replace(/\/$/, "");
  } catch {
    return u;
  }
}

export type LinkKind = "ig" | "yt" | "tt" | "fb" | "web";

export function linkKind(u: string): LinkKind {
  let h = "";
  try {
    h = new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {}
  if (/(^|\.)instagram\.com$/.test(h)) return "ig";
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(h)) return "yt";
  if (/(^|\.)tiktok\.com$/.test(h)) return "tt";
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(h)) return "fb";
  return "web";
}

// Texto del enlace en el botón del nº 1: el @usuario en las redes y la dirección en las webs.
export function linkText(u: string, k: LinkKind = linkKind(u)): string {
  try {
    const seg = new URL(u).pathname.split("/").filter(Boolean);
    if ((k === "ig" || k === "tt") && seg[0]) return "@" + seg[0].replace(/^@/, "");
    if (k === "yt" && seg[0]?.startsWith("@")) return seg[0];
    if (k === "fb" && seg[0] && !/^(profile\.php|people|pages|groups|share)$/i.test(seg[0])) return seg[0];
  } catch {}
  return host(u);
}

/* ------------------------------ Filtro rápido ------------------------------ */

const BANNED = [
  "idiota", "imbecil", "gilipollas", "gilipuertas", "subnormal", "mierda", "joder", "puta", "puto", "putas", "putos",
  "putita", "hijoputa", "hijodeputa", "cabron", "cabrona", "cabrones", "capullo", "zorra", "marica", "maricon",
  "maricona", "mariconazo", "retrasado", "retrasada", "pendejo", "cojones", "follar", "follando", "polla", "pollas",
  "chupapollas", "cono", "teta", "tetas", "culo", "culos", "tonto", "tonta", "guarra", "mamon", "mamona", "furcia",
  "bastardo", "nazi", "fuck", "shit", "bitch", "asshole", "cunt", "whore", "slut", "dick",
];
const THREATS = [
  /\b(te|os|les?|la|lo) voy a (matar|reventar|partir la cara|pegar|buscar)/,
  /\bvoy a matar(te|os|le|la|lo)?\b/,
  /\bmuerete\b/,
  /\b(te|os) mato\b/,
  /\bojala te mueras\b/,
  /\bse donde vives\b/,
  /\bte vas a enterar\b/,
];
const BAD_SITES = [
  "porn", "xxx", "xvideos", "xhamster", "onlyfans", "escort", "casino", "apuestas", "bet365", "betfair", "codere",
  "sportium", "pokerstars", "bwin",
];
// Acortadores: esconden a dónde lleva el enlace.
const SHORTENERS = /^(bit\.ly|tinyurl\.com|t\.co|goo\.gl|cutt\.ly|is\.gd|ow\.ly|shorturl\.at|rebrand\.ly|tiny\.cc|rb\.gy|s\.id|v\.gd)$/;

const deleet = (x: string) =>
  x.replace(/[4@]/g, "a").replace(/3/g, "e").replace(/[1!|]/g, "i").replace(/0/g, "o").replace(/[5$]/g, "s").replace(/7/g, "t");
const squash = (x: string) => x.replace(/(.)\1+/g, "$1");

function textProblem(raw: string): string | null {
  const p = plain(raw);
  const d = deleet(p);
  if (THREATS.some((r) => r.test(p) || r.test(d))) return "parece una amenaza";
  const words = new Set([...p.split(/[^a-z0-9]+/), ...d.split(/[^a-z]+/), ...squash(d).split(/[^a-z]+/)]);
  if (BANNED.some((w) => words.has(w) || words.has(squash(w)))) return "contiene insultos o palabras malsonantes";
  const glued = squash(d.replace(/[^a-z]/g, ""));
  if (BANNED.some((w) => w.length >= 6 && glued.includes(squash(w)))) return "contiene insultos o palabras malsonantes";
  return null;
}

export function nameProblem(name: string): string | null {
  if (/(https?:\/\/|www\.|\.(com|es|net|org|io|me|tv|app|shop)\b|@[a-z0-9_]{3,})/i.test(plain(name))) {
    return "lleva un enlace o una @mención (el enlace va en su casilla, más abajo)";
  }
  return textProblem(name);
}

export function linkProblem(url: string): string | null {
  if (!url) return null;
  const p = plain(url);
  let h = "";
  try {
    h = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {}
  if (SHORTENERS.test(h)) return "los acortadores de enlaces no se admiten; pon la dirección completa";
  if (BAD_SITES.some((w) => p.includes(w))) return "no se admiten webs para adultos, de apuestas o de estafas";
  if (textProblem(p.replace(/^https?:\/\//, ""))) return "contiene insultos o palabras malsonantes";
  return null;
}

export function initials(name: string): string {
  const w = name.replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/);
  return ((w[0] || "?")[0] + (w[1] ? w[1][0] : (w[0] || "")[1] || "")).toUpperCase();
}
