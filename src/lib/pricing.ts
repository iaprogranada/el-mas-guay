// Precios en céntimos (IVA incluido). Este archivo lo usan el servidor y el navegador.
export const PLANS = {
  one: { cents: 100, crowns: 1, label: "1 coronación en El Más Guay del Mundo" },
  pack: { cents: 500, crowns: 5, label: "Pack pique: 5 coronaciones en El Más Guay del Mundo" },
} as const;

export type Plan = keyof typeof PLANS;

export function isPlan(v: unknown): v is Plan {
  return v === "one" || v === "pack";
}

export function euros(cents: number): string {
  return (cents / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

// "1 €" o "5 €" para los botones.
export function shortEuros(cents: number): string {
  return cents % 100 === 0 ? `${cents / 100} €` : euros(cents);
}
