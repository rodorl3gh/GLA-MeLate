export const MAX_NUMBER = 56;

const LUCKY = new Set([3, 7, 9, 11, 13, 17, 21, 23, 27, 33, 37, 42, 49]);

const cache = new Map<number, number>();

/**
 * Estima qué tan "popular" es un número entre los jugadores humanos.
 * 0 = poco elegido (mejor para no compartir premio), 1 = muy elegido.
 *
 * Basado en sesgos documentados: fechas (1-31), números de la suerte,
 * terminaciones en 7 y números culturalmente "especiales".
 */
export function popularityScore(n: number): number {
  const cached = cache.get(n);
  if (cached !== undefined) return cached;

  let s = 0;
  if (n <= 12) s += 0.9;
  else if (n <= 31) s += 0.75;
  else if (n <= 40) s += 0.32;
  else s += 0.1;

  if (LUCKY.has(n)) s += 0.25;
  if (n % 10 === 7) s += 0.12;
  if (n === 7 || n === 13) s += 0.12;

  const value = Math.min(1, s);
  cache.set(n, value);
  return value;
}

export function popularityOf(combo: number[]): number {
  if (!combo.length) return 0;
  return combo.reduce((acc, n) => acc + popularityScore(n), 0) / combo.length;
}

/** Rango de popularidad (menor = combinación menos jugada por el público). */
export function popularityRange(): [number, number] {
  const values = Array.from({ length: MAX_NUMBER }, (_, i) => popularityScore(i + 1));
  return [Math.min(...values), Math.max(...values)];
}
