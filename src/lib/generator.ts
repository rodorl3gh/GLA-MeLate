import { computeStats, MAX_NUMBER } from "./statistics";
import { popularityOf, popularityScore } from "./popularity";
import type {
  ComboMetrics,
  ConsensusMetrics,
  Draw,
  GameKey,
  GenerateRequest,
  GeneratedCombo,
  StatsResult,
  Strategy,
} from "./types";

const DISCLAIMER =
  "Las combinaciones se generan con un modelo estadístico heurístico sobre resultados históricos. Los sorteos son aleatorios: ninguna estadística aumenta la probabilidad real de ganar. El modo anti-popularidad no eleva la probabilidad de acertar, pero reduce el riesgo de compartir el premio con más ganadores.";

function normalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range <= 0) return values.map(() => 0.5);
  return values.map((v) => (v - min) / range);
}

interface Weights {
  weights: number[];
  hotNorm: number[];
  coldNorm: number[];
  pairNorm: number[];
}

function buildWeights(
  stats: StatsResult,
  strategy: Strategy,
  antiPopularity: boolean
): Weights {
  const sorted = [...stats.numbers].sort((a, b) => a.n - b.n);
  const hotNorm = normalize(sorted.map((s) => s.count));
  const coldNorm = normalize(sorted.map((s) => s.overdue));

  const pairRaw = new Array(MAX_NUMBER + 1).fill(0);
  const maxPair = stats.pairs.reduce((m, p) => Math.max(m, p.count), 0) || 1;
  for (const p of stats.pairs) {
    pairRaw[p.a] += p.count;
    pairRaw[p.b] += p.count;
  }
  const pairNorm = pairRaw.slice(1).map((v) => v / maxPair);

  const weights = sorted.map((s, i) => {
    const hot = hotNorm[i];
    const cold = coldNorm[i];
    const pair = pairNorm[i];
    let w: number;
    switch (strategy) {
      case "calientes":
        w = 0.15 + 1.85 * hot;
        break;
      case "frias":
        w = 0.15 + 1.85 * cold;
        break;
      case "balanceada":
        w = 0.2 + 0.9 * hot + 0.9 * cold;
        break;
      case "aleatoria":
        w = 1;
        break;
      case "estadistica":
      default:
        w = 0.1 + 0.6 * hot + 0.8 * cold + 0.5 * pair;
        break;
    }
    if (antiPopularity) {
      w *= 1 - 0.8 * popularityScore(s.n);
    }
    return w;
  });

  return { weights, hotNorm, coldNorm, pairNorm };
}

function weightedPick(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i + 1;
  }
  return weights.length;
}

function sampleCombo(weights: number[]): number[] {
  const pool = new Set<number>();
  let guard = 0;
  while (pool.size < 6 && guard < 500) {
    guard++;
    pool.add(weightedPick(weights));
  }
  while (pool.size < 6) pool.add(Math.floor(Math.random() * MAX_NUMBER) + 1);
  return [...pool].sort((a, b) => a - b);
}

function decadeIndex(n: number): number {
  if (n <= 10) return 0;
  if (n <= 20) return 1;
  if (n <= 30) return 2;
  if (n <= 40) return 3;
  if (n <= 50) return 4;
  return 5;
}

function isPlausible(combo: number[], stats: StatsResult): boolean {
  const sum = combo.reduce((a, b) => a + b, 0);
  const { mean, std, commonRange } = stats.sum;
  const low = Math.max(commonRange[0] - 15, mean - 1.8 * std);
  const high = Math.min(commonRange[1] + 15, mean + 1.8 * std);
  if (sum < low || sum > high) return false;

  const odds = combo.filter((n) => n % 2 === 1).length;
  if (odds < 1 || odds > 5) return false;

  const lows = combo.filter((n) => n <= 28).length;
  if (lows < 1 || lows > 5) return false;

  const decades = new Array(6).fill(0);
  for (const n of combo) decades[decadeIndex(n)]++;
  if (Math.max(...decades) > 3) return false;
  if (decades.filter((d) => d > 0).length < 3) return false;

  return true;
}

function scoreCombo(
  combo: number[],
  stats: StatsResult,
  w: Weights,
  antiPopularity: boolean
): { score: number; metrics: ComboMetrics } {
  const idx = (n: number) => n - 1;

  const numberScore = combo.reduce((a, n) => a + w.weights[idx(n)], 0) / 6;
  const maxW = Math.max(...w.weights);
  const normNumberScore = maxW > 0 ? numberScore / maxW : 0;

  const sum = combo.reduce((a, b) => a + b, 0);
  const { mean, std } = stats.sum;
  const denom = std > 0 ? 2 * std * std : 1;
  const sumScore = Math.exp(-((sum - mean) ** 2) / denom);

  const odds = combo.filter((n) => n % 2 === 1).length;
  const parityScore = 1 - Math.abs(odds - stats.parity.mostCommon) / 3;

  const low = combo.filter((n) => n <= 28).length;
  const lowScore = 1 - Math.abs(low - stats.lowHigh.mostCommon) / 3;

  const decades = new Array(6).fill(0);
  for (const n of combo) decades[decadeIndex(n)]++;
  const distinct = decades.filter((d) => d > 0).length;
  const decadeScore = distinct / 6 - (Math.max(...decades) > 3 ? 0.3 : 0);

  const pairMap = new Map<string, number>();
  const maxPair = stats.pairs.reduce((m, p) => Math.max(m, p.count), 0) || 1;
  for (const p of stats.pairs) pairMap.set(`${p.a}-${p.b}`, p.count);
  let pairSum = 0;
  for (let i = 0; i < combo.length; i++) {
    for (let j = i + 1; j < combo.length; j++) {
      pairSum += (pairMap.get(`${combo[i]}-${combo[j]}`) ?? 0) / maxPair;
    }
  }
  const pairScore = pairSum / 15;

  const hotSet = new Set(stats.hot);
  const coldSet = new Set(stats.cold);
  const overdueSet = new Set(stats.overdueNumbers);
  const hotHits = combo.filter((n) => hotSet.has(n)).length;
  const coldHits = combo.filter((n) => coldSet.has(n)).length;
  const overdueHits = combo.filter((n) => overdueSet.has(n)).length;

  const popularity = popularityOf(combo);
  const antiPopularityBonus = antiPopularity ? 0.18 * (1 - popularity) : 0;

  const score =
    0.3 * normNumberScore +
    0.22 * sumScore +
    0.12 * Math.max(0, parityScore) +
    0.1 * Math.max(0, lowScore) +
    0.1 * Math.max(0, decadeScore) +
    0.16 * pairScore +
    antiPopularityBonus;

  return {
    score,
    metrics: {
      sum,
      odds,
      low,
      decades,
      hotHits,
      coldHits,
      overdueHits,
      pairScore,
      popularity,
    },
  };
}

function pickAdicional(weights: number[], exclude: number[]): number {
  const available = weights.map((w, i) => (exclude.includes(i + 1) ? 0 : w));
  if (available.every((w) => w === 0)) {
    let n = Math.floor(Math.random() * MAX_NUMBER) + 1;
    while (exclude.includes(n)) n = Math.floor(Math.random() * MAX_NUMBER) + 1;
    return n;
  }
  return weightedPick(available);
}

function additionalWeights(stats: StatsResult): number[] {
  const weights = new Array(MAX_NUMBER).fill(0.15);
  for (const a of stats.adicional) weights[a.n - 1] += a.count;
  return weights;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function coherenceOf(combo: number[], stats: StatsResult): number {
  const sum = combo.reduce((a, b) => a + b, 0);
  const { mean, std } = stats.sum;
  const denom = std > 0 ? 2 * std * std : 1;
  const sumScore = Math.exp(-((sum - mean) ** 2) / denom);

  const odds = combo.filter((n) => n % 2 === 1).length;
  const parityScore = clamp01(1 - Math.abs(odds - stats.parity.mostCommon) / 3);

  const low = combo.filter((n) => n <= 28).length;
  const lowScore = clamp01(1 - Math.abs(low - stats.lowHigh.mostCommon) / 3);

  const decades = new Array(6).fill(0);
  for (const n of combo) decades[decadeIndex(n)]++;
  const distinct = decades.filter((d) => d > 0).length;
  const decadeScore = clamp01(
    distinct / 6 - (Math.max(...decades) > 3 ? 0.3 : 0)
  );

  return (
    0.42 * sumScore + 0.2 * parityScore + 0.16 * lowScore + 0.22 * decadeScore
  );
}

/**
 * Segunda etapa: vuelve a analizar las combinaciones ya generadas como conjunto
 * (consenso entre opciones, coherencia estadística, sinergia de pares y
 * anti-popularidad) y devuelve únicamente la más probable.
 */
export function selectMostProbable(
  finalists: GeneratedCombo[],
  stats: StatsResult,
  antiPopularity: boolean
): GeneratedCombo | null {
  if (finalists.length === 0) return null;

  const poolSize = finalists.length;
  const freq = new Map<number, number>();
  for (const c of finalists) {
    for (const n of c.numbers) freq.set(n, (freq.get(n) ?? 0) + 1);
  }

  const stage1Order = [...finalists].sort((a, b) => b.score - a.score);
  const stage1Rank = new Map<string, number>();
  stage1Order.forEach((c, i) => stage1Rank.set(c.numbers.join("-"), i + 1));
  const bestStage1 = stage1Order[0].score || 0.0001;

  const scored = finalists.map((c) => {
    const key = c.numbers.join("-");
    const stage1 = clamp01(c.score / bestStage1);
    const consensus =
      c.numbers.reduce((a, n) => a + (freq.get(n) ?? 0) / poolSize, 0) / 6;
    const coherence = coherenceOf(c.numbers, stats);
    const pair = clamp01(c.metrics.pairScore);
    const anti = antiPopularity ? clamp01(1 - c.metrics.popularity) : 0;

    const weights = {
      stage1: 0.45,
      consensus: 0.25,
      coherence: 0.14,
      pair: 0.06,
      anti: antiPopularity ? 0.1 : 0,
    };
    const totalWeight =
      weights.stage1 + weights.consensus + weights.coherence + weights.pair + weights.anti;

    const finalScore =
      (weights.stage1 * stage1 +
        weights.consensus * consensus +
        weights.coherence * coherence +
        weights.pair * pair +
        weights.anti * anti) /
      totalWeight;

    return { combo: c, stage1, consensus, coherence, finalScore, rank: stage1Rank.get(key) ?? poolSize };
  });

  scored.sort((a, b) => b.finalScore - a.finalScore);
  const winner = scored[0];
  const runnerUp = scored[1];
  const relativeMargin =
    runnerUp && winner.finalScore > 0
      ? clamp01((winner.finalScore - runnerUp.finalScore) / winner.finalScore)
      : 0;
  const confidence = clamp01(0.55 + 0.44 * Math.min(1, relativeMargin * 3));

  const sharedNumbers = [...freq.entries()]
    .filter(([, count]) => count / poolSize >= 0.5)
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([n]) => n);

  const consensus: ConsensusMetrics = {
    optionsAnalyzed: poolSize,
    confidence,
    sharedNumbers,
    stage1Rank: winner.rank,
    stage1Score: clamp01(winner.stage1),
  };

  return { ...winner.combo, score: winner.finalScore, consensus };
}

export function generateCombos(
  game: GameKey,
  draws: Draw[],
  req: Pick<
    GenerateRequest,
    "count" | "strategy" | "window" | "includeAdicional" | "antiPopularity"
  >,
  opts: { candidateCount?: number; pickSingle?: boolean } = {}
): { combos: GeneratedCombo[]; stats: StatsResult } {
  const stats = computeStats(game, draws, req.window);
  const w = buildWeights(stats, req.strategy, req.antiPopularity);
  const count = Math.max(1, Math.min(12, req.count));

  const candidateCount = opts.candidateCount ?? Math.max(800, count * 250);
  const seen = new Set<string>();
  const candidates: GeneratedCombo[] = [];

  for (let i = 0; i < candidateCount; i++) {
    let combo = sampleCombo(w.weights);
    let tries = 0;
    while (!isPlausible(combo, stats) && tries < 30) {
      combo = sampleCombo(w.weights);
      tries++;
    }
    const key = combo.join("-");
    if (seen.has(key)) continue;
    seen.add(key);
    const { score, metrics } = scoreCombo(combo, stats, w, req.antiPopularity);
    candidates.push({ numbers: combo, score, metrics });
  }

  candidates.sort((a, b) => b.score - a.score);

  const selected: GeneratedCombo[] = [];
  const overlaps = (a: number[], b: number[], max: number) =>
    a.filter((n) => b.includes(n)).length > max;

  for (const threshold of [3, 4]) {
    for (const c of candidates) {
      if (selected.length >= count) break;
      if (selected.some((s) => overlaps(s.numbers, c.numbers, threshold))) continue;
      if (selected.some((s) => s.numbers.join("-") === c.numbers.join("-"))) continue;
      selected.push(c);
    }
    if (selected.length >= count) break;
  }

  const addWeights = additionalWeights(stats);
  for (const combo of selected) {
    if (req.includeAdicional) {
      combo.adicional = pickAdicional(addWeights, combo.numbers);
    }
  }

  selected.sort((a, b) => b.score - a.score);

  if (opts.pickSingle) {
    const winner = selectMostProbable(selected, stats, req.antiPopularity);
    return { combos: winner ? [winner] : [], stats };
  }

  return { combos: selected, stats };
}

export { DISCLAIMER };
