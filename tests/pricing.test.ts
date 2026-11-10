import assert from "node:assert/strict";
import { test } from "node:test";
import { euros, isPlan, PLANS, shortEuros } from "../src/lib/pricing.ts";
import { clock, dur } from "../src/lib/format.ts";

test("precios", () => {
  assert.equal(PLANS.one.cents, 100);
  assert.equal(PLANS.pack.cents, 500);
  assert.equal(PLANS.pack.crowns, 5);
  assert.ok(isPlan("one") && isPlan("pack") && !isPlan("tres"));
  assert.equal(euros(100).replace(/\s/g, " "), "1,00 €");
  assert.equal(shortEuros(500), "5 €");
});

test("tiempos", () => {
  assert.equal(dur(3_000), "3 s");
  assert.equal(dur(5 * 60_000), "5 min");
  assert.equal(dur((6 * 60 + 41) * 60_000), "6 h 41 min");
  assert.equal(dur(26 * 3_600_000), "1 d 2 h");
  assert.equal(clock(3_661_000), "01:01:01");
});
