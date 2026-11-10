import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ALLOWED_EMOJIS,
  checkName,
  cleanLink,
  initials,
  linkKind,
  linkProblem,
  linkText,
  nameKey,
  nameProblem,
  normalizeName,
  PRESETS,
} from "../src/lib/validation.ts";

test("nombres: limpieza y clave única", () => {
  assert.equal(normalizeName("  Banana   Loca ​"), "Banana Loca");
  assert.equal(nameKey("Banana Loca"), nameKey("banana  locá"));
});

test("nombres: largo y caracteres", () => {
  assert.match(checkName("a") ?? "", /al menos 2/);
  assert.equal(checkName("Toldos La Manolita de Jerez SL"), null); // 30 caracteres justos
  assert.match(checkName("x".repeat(31)) ?? "", /30/);
  assert.ok(checkName("<script>"));
  assert.ok(checkName("!!!"));
  assert.equal(checkName("Pepe el del 5ºB"), null);
});

test("filtro rápido de nombres", () => {
  assert.ok(nameProblem("eres un gilipollas"));
  assert.ok(nameProblem("g1l1p0llas"));
  assert.ok(nameProblem("te voy a matar"));
  assert.ok(nameProblem("sígueme en @pepe_oficial"));
  assert.ok(nameProblem("mitienda.com"));
  assert.equal(nameProblem("Churrería Paqui"), null);
  assert.equal(nameProblem("Persianas Ramírez"), null);
  assert.equal(nameProblem("Un Mono Con Gafas"), null);
});

test("enlaces: se limpian y se rechazan los raros", () => {
  assert.equal(cleanLink(""), "");
  assert.equal(cleanLink("instagram.com/lucia"), "https://instagram.com/lucia");
  assert.equal(cleanLink("http://churreriapaqui.com/"), "http://churreriapaqui.com/");
  assert.equal(cleanLink("javascript:alert(1)"), null);
  assert.equal(cleanLink("https://user:pass@ejemplo.com"), null);
  assert.equal(cleanLink("http://192.168.1.1"), null);
  assert.equal(cleanLink("localhost:3000"), null);
  assert.equal(cleanLink("no es un enlace"), null);
});

test("enlaces: filtro rápido", () => {
  assert.ok(linkProblem("https://bit.ly/abc"));
  assert.ok(linkProblem("https://casino-ganador.com"));
  assert.ok(linkProblem("https://pornhub.com"));
  assert.equal(linkProblem("https://instagram.com/lucia"), null);
  assert.equal(linkProblem(""), null);
});

test("botón del enlace del nº 1: red y @usuario", () => {
  assert.equal(linkKind("https://instagram.com/luciaviaja"), "ig");
  assert.equal(linkKind("https://www.youtube.com/@latete"), "yt");
  assert.equal(linkKind("https://tiktok.com/@juanma"), "tt");
  assert.equal(linkKind("https://facebook.com/persianasramirez"), "fb");
  assert.equal(linkKind("https://persianasramirez.es"), "web");
  assert.equal(linkText("https://instagram.com/luciaviaja/"), "@luciaviaja");
  assert.equal(linkText("https://youtube.com/@latete"), "@latete");
  assert.equal(linkText("https://facebook.com/persianasramirez"), "persianasramirez");
  assert.equal(linkText("https://facebook.com/profile.php?id=1"), "facebook.com/profile.php");
  assert.equal(linkText("https://www.persianasramirez.es/"), "persianasramirez.es");
});

test("avatares: 12 y los emojis permitidos", () => {
  assert.equal(PRESETS.length, 12);
  assert.equal(ALLOWED_EMOJIS.size, 11);
  assert.ok(ALLOWED_EMOJIS.has("🛫"));
  assert.ok(!ALLOWED_EMOJIS.has("🥸"));
  assert.equal(initials("Banana Loca"), "BL");
  assert.equal(initials("Kiko"), "KI");
});
