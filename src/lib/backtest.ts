import { generateCombos } from "./generator";
import { MAX_NUMBER } from "./popularity";
import type {
  BacktestPoint,
  BacktestRequest,
  BacktestResponse,
  Draw,
  GameKey,
} from "./types";

const THEORETICAL = (6 * 6) / MAX_NUMBER;

function randomCombo(): number[] {
  const pool = new Set<number>();
  while (pool.size < 6) pool.add(Math.floor(Math.random() * MAX_NUMBER) + 1);
  return [...pool].sort((a, b) => a - b);
}

function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function std(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function runBacktest(
  game: GameKey,
  draws: Draw[],
  req: BacktestRequest
): BacktestResponse {
  const drawsToTest = Math.max(20, Math.min(300, Math.round(req.drawsToTest) || 120));
  const combosPerDraw = Math.max(1, Math.min(5, Math.round(req.combosPerDraw) || 1));
  const historyCap =
    req.window === "all" ? 500 : Math.max(60, Math.min(Number(req.window) || 500, 500));

  const points: BacktestPoint[] = [];
  const strategyMatches: number[] = [];
  const randomMatches: number[] = [];
  const strategyHitDist = new Array(7).fill(0);
  const randomHitDist = new Array(7).fill(0);

  let tested = 0;
  for (let i = 0; i < draws.length && tested < drawsToTest; i++) {
    const history = draws.slice(i + 1, i + 1 + historyCap);
    if (history.length < 60) break;

    const target = draws[i];
    const targetSet = new Set(target.numbers);

    const { combos } = generateCombos(
      game,
      history,
      {
        count: combosPerDraw,
        strategy: req.strategy,
        window: req.window,
        includeAdicional: false,
        antiPopularity: req.antiPopularity,
      },
      { candidateCount: 140 }
    );

    let best = 0;
    for (const c of combos) {
      const matches = c.numbers.filter((n) => targetSet.has(n)).length;
      if (matches > best) best = matches;
    }

    let randBest = 0;
    for (let k = 0; k < combosPerDraw; k++) {
      const rc = randomCombo();
      const matches = rc.filter((n) => targetSet.has(n)).length;
      if (matches > randBest) randBest = matches;
    }

    strategyMatches.push(best);
    randomMatches.push(randBest);
    strategyHitDist[best] += 1;
    randomHitDist[randBest] += 1;
    points.push({
      concurso: target.concurso,
      date: target.date,
      matches: best,
      randomMatches: randBest,
    });
    tested++;
  }

  const strategyAvg = mean(strategyMatches);
  const randomAvg = mean(randomMatches);
  const sd = std(strategyMatches, strategyAvg);
  const se = tested > 0 ? sd / Math.sqrt(tested) : 0;
  const zScore = se > 0 ? (strategyAvg - THEORETICAL) / se : 0;

  const drawsWith3Plus = strategyMatches.filter((m) => m >= 3).length;
  const randomWith3Plus = randomMatches.filter((m) => m >= 3).length;
  const bestMatch = strategyMatches.length ? Math.max(...strategyMatches) : 0;

  let conclusion: string;
  if (tested < 30) {
    conclusion =
      "Muestra insuficiente para conclusiones firmes. Aumenta el número de sorteos a evaluar.";
  } else if (Math.abs(zScore) < 1.96) {
    conclusion =
      "La estrategia NO muestra diferencia estadísticamente significativa frente al azar (|z| < 1.96). Es el resultado esperado en un sorteo aleatorio: la estadística no aporta ventaja predictiva. El valor real del sistema está en el modo anti-popularidad y la cobertura, no en predecir.";
  } else if (zScore > 0) {
    conclusion =
      "Se observa una diferencia positiva significativa, pero con alta probabilidad es sobreajuste o azar de una muestra corta. Repite el backtest cambiando la ventana y el número de sorteos: si el efecto desaparece, no es real.";
  } else {
    conclusion =
      "Diferencia negativa significativa: la estrategia rindió por debajo del azar en esta muestra. Es evidencia de que no hay señal predictiva explotable.";
  }

  return {
    game,
    strategy: req.strategy,
    window: req.window,
    antiPopularity: req.antiPopularity,
    drawsTested: tested,
    combosPerDraw,
    strategyAvg,
    randomAvg,
    theoreticalAvg: THEORETICAL,
    strategyHitDist,
    randomHitDist,
    bestMatch,
    drawsWith3Plus,
    randomWith3Plus,
    zScore,
    conclusion,
    points,
  };
}
