import { eraInfo, getCurrentEra } from "./statistics";
import type { Draw, GameKey, RandomnessResult } from "./types";

export const MAX_NUMBER = 56;

function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** p-valor (cola superior) para un estadístico chi-cuadrado, aproximación Wilson-Hilferty. */
export function chiSquarePValue(x: number, df: number): number {
  if (x <= 0 || df <= 0) return 1;
  const t = Math.cbrt(x / df) - (1 - 2 / (9 * df));
  const z = t / Math.sqrt(2 / (9 * df));
  return Math.max(0, Math.min(1, 1 - normalCdf(z)));
}

/**
 * Test de uniformidad chi-cuadrado sobre la frecuencia de cada número.
 * H0: todos los números salen con la misma probabilidad (sorteo justo).
 * p > 0.05 -> no se detecta sesgo explotable.
 */
export function testRandomness(game: GameKey, allDraws: Draw[]): RandomnessResult {
  const draws = getCurrentEra(allDraws);
  const era = eraInfo(allDraws);
  const totalDraws = draws.length;
  const counts = new Array(MAX_NUMBER).fill(0);
  for (const draw of draws) {
    for (const n of draw.numbers) {
      if (n >= 1 && n <= MAX_NUMBER) counts[n - 1] += 1;
    }
  }

  const expectedPerNumber = (totalDraws * 6) / MAX_NUMBER;
  let chiSquare = 0;
  const observations = counts.map((observed, i) => {
    const deviation = observed - expectedPerNumber;
    chiSquare += (deviation * deviation) / expectedPerNumber;
    return { n: i + 1, observed, expected: expectedPerNumber, deviation };
  });

  const degreesOfFreedom = MAX_NUMBER - 1;
  const pValue = chiSquarePValue(chiSquare, degreesOfFreedom);
  const uniform = pValue > 0.05;

  const verdict = uniform
    ? "Sobre la era actual 1-56 no se detecta sesgo estadísticamente significativo: el sorteo se comporta como aleatorio uniforme. No hay ventaja predictiva explotable."
    : "Se detecta una desviación significativa respecto a la uniformidad en la era 1-56. Conviene revisar los números con mayor desviación, aunque con múltiples pruebas puede ser azar.";

  return {
    game,
    totalDraws,
    eraStart: era.eraStart,
    eraStartDate: era.eraStartDate,
    chiSquare,
    degreesOfFreedom,
    pValue,
    uniform,
    expectedPerNumber,
    observations,
    verdict,
  };
}
