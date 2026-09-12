import { popularityScore } from "./popularity";
import type { Draw, GameKey, NumberStat, StatsResult } from "./types";

export const MAX_NUMBER = 56;
export const DECADES: { label: string; min: number; max: number }[] = [
  { label: "1-10", min: 1, max: 10 },
  { label: "11-20", min: 11, max: 20 },
  { label: "21-30", min: 21, max: 30 },
  { label: "31-40", min: 31, max: 40 },
  { label: "41-50", min: 41, max: 50 },
  { label: "51-56", min: 51, max: 56 },
];

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function std(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function resolveWindow(draws: Draw[], window: number | "all"): number {
  if (window === "all") return draws.length;
  return Math.max(1, Math.min(window, draws.length));
}

/**
 * El Melate cambió de matriz a lo largo de su historia (6/44 → 6/50 → 6/56).
 * Analizar todo el histórico mezcla reglas distintas y sesga los resultados.
 * Detectamos la era actual como el tramo en el que ya existían números > 50 (1-56).
 */
export function getCurrentEra(draws: Draw[]): Draw[] {
  let eraStart = Infinity;
  for (const draw of draws) {
    if (draw.numbers.some((n) => n > 50)) {
      eraStart = Math.min(eraStart, draw.concurso);
    }
  }
  if (!Number.isFinite(eraStart)) return draws;
  return draws.filter((d) => d.concurso >= eraStart);
}

export function eraInfo(draws: Draw[]): { eraStart: number; eraStartDate: string } {
  let eraStart = Infinity;
  for (const draw of draws) {
    if (draw.numbers.some((n) => n > 50)) {
      eraStart = Math.min(eraStart, draw.concurso);
    }
  }
  const found = draws.find((d) => d.concurso === eraStart);
  return { eraStart: Number.isFinite(eraStart) ? eraStart : 0, eraStartDate: found?.date ?? "" };
}

export function computeStats(
  game: GameKey,
  draws: Draw[],
  window: number | "all" = "all"
): StatsResult {
  const totalDraws = draws.length;
  const win = resolveWindow(draws, window);
  const windowDraws = draws.slice(0, win);

  const numbers: NumberStat[] = [];
  for (let n = 1; n <= MAX_NUMBER; n++) {
    const appearances: number[] = [];
    let total = 0;
    for (let i = 0; i < totalDraws; i++) {
      if (draws[i].numbers.includes(n)) {
        appearances.push(i);
        total++;
      }
    }

    const windowCount = windowDraws.reduce(
      (acc, d) => acc + (d.numbers.includes(n) ? 1 : 0),
      0
    );
    const recent = draws.slice(0, 20).reduce(
      (acc, d) => acc + (d.numbers.includes(n) ? 1 : 0),
      0
    );

    const gap = appearances.length ? appearances[0] : totalDraws;
    const lastIdx = appearances.length ? appearances[0] : -1;
    const lastSeen = lastIdx >= 0 ? draws[lastIdx] : undefined;

    let avgGap = total > 0 ? totalDraws / total : totalDraws;
    if (appearances.length >= 2) {
      const gaps: number[] = [];
      for (let i = 1; i < appearances.length; i++) {
        gaps.push(appearances[i - 1] - appearances[i]);
      }
      avgGap = mean(gaps);
    }

    numbers.push({
      n,
      count: windowCount,
      total,
      frequency: win > 0 ? windowCount / win : 0,
      lastSeenDraw: lastSeen?.concurso ?? 0,
      lastSeenDate: lastSeen?.date ?? "",
      gap,
      avgGap: Math.max(avgGap, 0.5),
      overdue: gap / Math.max(avgGap, 0.5),
      recent,
      popularity: popularityScore(n),
    });
  }

  const sums = windowDraws.map((d) => d.numbers.reduce((a, b) => a + b, 0));
  const sumMean = mean(sums);
  const sumStd = std(sums, sumMean);
  const commonRange: [number, number] = [
    Math.max(0, Math.round(sumMean - sumStd)),
    Math.round(sumMean + sumStd),
  ];

  const minSum = sums.length ? Math.min(...sums) : 0;
  const maxSum = sums.length ? Math.max(...sums) : 0;
  const binStart = Math.floor(minSum / 10) * 10;
  const binEnd = Math.ceil(maxSum / 10) * 10;
  const histogram: { sum: number; count: number }[] = [];
  for (let s = binStart; s <= binEnd; s += 10) {
    const count = sums.filter((v) => v >= s && v < s + 10).length;
    histogram.push({ sum: s, count });
  }

  const parityCounts = new Array(7).fill(0);
  const lowCounts = new Array(7).fill(0);
  const decadeCounts = DECADES.map(() => 0);
  const pairMap = new Map<string, number>();
  let withConsecutive = 0;
  const weekdayMap = new Map<number, { count: number; sum: number }>();

  for (const draw of windowDraws) {
    const odds = draw.numbers.filter((n) => n % 2 === 1).length;
    parityCounts[odds] += 1;
    const low = draw.numbers.filter((n) => n <= 28).length;
    lowCounts[low] += 1;

    for (const n of draw.numbers) {
      const di = DECADES.findIndex((d) => n >= d.min && n <= d.max);
      if (di >= 0) decadeCounts[di] += 1;
    }

    let hasConsecutive = false;
    for (let i = 0; i < draw.numbers.length - 1; i++) {
      if (draw.numbers[i + 1] - draw.numbers[i] === 1) hasConsecutive = true;
    }
    if (hasConsecutive) withConsecutive += 1;

    for (let i = 0; i < draw.numbers.length; i++) {
      for (let j = i + 1; j < draw.numbers.length; j++) {
        const key = `${draw.numbers[i]}-${draw.numbers[j]}`;
        pairMap.set(key, (pairMap.get(key) ?? 0) + 1);
      }
    }

    const wk = draw.weekday;
    const entry = weekdayMap.get(wk) ?? { count: 0, sum: 0 };
    entry.count += 1;
    entry.sum += draw.numbers.reduce((a, b) => a + b, 0);
    weekdayMap.set(wk, entry);
  }

  const parityDistribution = parityCounts.map((count, odds) => ({ odds, count }));
  const lowHighDistribution = lowCounts.map((count, low) => ({ low, count }));

  const mostCommonOdds = parityDistribution.reduce((a, b) => (b.count > a.count ? b : a));
  const mostCommonLow = lowHighDistribution.reduce((a, b) => (b.count > a.count ? b : a));

  const decades = DECADES.map((d, i) => {
    const totalNumbers = windowDraws.length * 6;
    return {
      label: d.label,
      count: decadeCounts[i],
      pct: totalNumbers ? decadeCounts[i] / totalNumbers : 0,
    };
  });

  const pairs = [...pairMap.entries()]
    .map(([key, count]) => {
      const [a, b] = key.split("-").map(Number);
      return { a, b, count };
    })
    .sort((x, y) => y.count - x.count)
    .slice(0, 12);

  const weekday = [...weekdayMap.entries()]
    .map(([w, v]) => ({
      weekday: w,
      count: v.count,
      avgSum: v.count ? v.sum / v.count : 0,
    }))
    .sort((a, b) => a.weekday - b.weekday);

  const repeatCounts = new Array(7).fill(0);
  let repeatPairs = 0;
  let repeatTotal = 0;
  for (let i = 0; i < windowDraws.length - 1; i++) {
    const setA = new Set(windowDraws[i].numbers);
    const shared = windowDraws[i + 1].numbers.filter((n) => setA.has(n)).length;
    repeatCounts[shared] += 1;
    repeatTotal += shared;
    repeatPairs += 1;
  }

  const adicionalMap = new Map<number, number>();
  for (const draw of windowDraws) {
    if (typeof draw.adicional === "number") {
      adicionalMap.set(draw.adicional, (adicionalMap.get(draw.adicional) ?? 0) + 1);
    }
  }
  const adicional = [...adicionalMap.entries()]
    .map(([n, count]) => ({ n, count }))
    .sort((a, b) => b.count - a.count);

  const byCount = [...numbers].sort((a, b) => b.count - a.count || a.n - b.n);
  const hot = byCount.slice(0, 8).map((s) => s.n);
  const cold = [...numbers]
    .sort((a, b) => a.count - b.count || b.overdue - a.overdue)
    .slice(0, 8)
    .map((s) => s.n);
  const overdueNumbers = [...numbers]
    .sort((a, b) => b.overdue - a.overdue)
    .slice(0, 8)
    .map((s) => s.n);

  return {
    game,
    window: win,
    windowLabel:
      window === "all" ? "Era actual 1-56 (histórico reciente)" : `Últimos ${win} sorteos`,
    totalDraws,
    numbers,
    sum: {
      min: minSum,
      max: maxSum,
      mean: sumMean,
      std: sumStd,
      commonRange,
      histogram,
    },
    parity: {
      distribution: parityDistribution,
      mostCommon: mostCommonOdds.odds,
    },
    lowHigh: {
      distribution: lowHighDistribution,
      mostCommon: mostCommonLow.low,
    },
    decades,
    consecutive: {
      withConsecutivePct: windowDraws.length ? withConsecutive / windowDraws.length : 0,
    },
    pairs,
    weekday,
    repeats: {
      avg: repeatPairs ? repeatTotal / repeatPairs : 0,
      distribution: repeatCounts.map((count, repeats) => ({ repeats, count })),
    },
    adicional,
    hot,
    cold,
    overdueNumbers,
  };
}
