export type GameKey = "melate" | "revancha" | "revanchita";

export interface Draw {
  concurso: number;
  numbers: number[];
  adicional?: number;
  bolsa: number;
  date: string;
  weekday: number;
}

export type DataSource = "live" | "fallback";

export interface GameData {
  game: GameKey;
  draws: Draw[];
  source: DataSource;
  updatedAt: string;
  nextDraw: string;
}

export interface NumberStat {
  n: number;
  count: number;
  total: number;
  frequency: number;
  lastSeenDraw: number;
  lastSeenDate: string;
  gap: number;
  avgGap: number;
  overdue: number;
  recent: number;
  popularity: number;
}

export interface StatsResult {
  game: GameKey;
  window: number;
  windowLabel: string;
  totalDraws: number;
  numbers: NumberStat[];
  sum: {
    min: number;
    max: number;
    mean: number;
    std: number;
    commonRange: [number, number];
    histogram: { sum: number; count: number }[];
  };
  parity: {
    distribution: { odds: number; count: number }[];
    mostCommon: number;
  };
  lowHigh: {
    distribution: { low: number; count: number }[];
    mostCommon: number;
  };
  decades: { label: string; count: number; pct: number }[];
  consecutive: { withConsecutivePct: number };
  pairs: { a: number; b: number; count: number }[];
  weekday: { weekday: number; count: number; avgSum: number }[];
  repeats: { avg: number; distribution: { repeats: number; count: number }[] };
  adicional: { n: number; count: number }[];
  hot: number[];
  cold: number[];
  overdueNumbers: number[];
}

export type Strategy =
  | "estadistica"
  | "calientes"
  | "frias"
  | "balanceada"
  | "aleatoria";

export interface GenerateRequest {
  game: GameKey;
  count: number;
  strategy: Strategy;
  window: number | "all";
  includeAdicional: boolean;
  antiPopularity: boolean;
}

export interface ComboMetrics {
  sum: number;
  odds: number;
  low: number;
  decades: number[];
  hotHits: number;
  coldHits: number;
  overdueHits: number;
  pairScore: number;
  popularity: number;
}

export interface ConsensusMetrics {
  optionsAnalyzed: number;
  confidence: number;
  sharedNumbers: number[];
  stage1Rank: number;
  stage1Score: number;
}

export interface GeneratedCombo {
  numbers: number[];
  adicional?: number;
  score: number;
  metrics: ComboMetrics;
  consensus?: ConsensusMetrics;
}

export interface GenerateResponse {
  game: GameKey;
  strategy: Strategy;
  window: number | "all";
  antiPopularity: boolean;
  generatedAt: string;
  nextDraw: string;
  source: DataSource;
  combos: GeneratedCombo[];
  disclaimer: string;
}

export interface RandomnessResult {
  game: GameKey;
  totalDraws: number;
  eraStart: number;
  eraStartDate: string;
  chiSquare: number;
  degreesOfFreedom: number;
  pValue: number;
  uniform: boolean;
  expectedPerNumber: number;
  observations: { n: number; observed: number; expected: number; deviation: number }[];
  verdict: string;
}

export interface BacktestRequest {
  game: GameKey;
  strategy: Strategy;
  window: number | "all";
  antiPopularity: boolean;
  drawsToTest: number;
  combosPerDraw: number;
}

export interface BacktestPoint {
  concurso: number;
  date: string;
  matches: number;
  randomMatches: number;
}

export interface BacktestResponse {
  game: GameKey;
  strategy: Strategy;
  window: number | "all";
  antiPopularity: boolean;
  drawsTested: number;
  combosPerDraw: number;
  strategyAvg: number;
  randomAvg: number;
  theoreticalAvg: number;
  strategyHitDist: number[];
  randomHitDist: number[];
  bestMatch: number;
  drawsWith3Plus: number;
  randomWith3Plus: number;
  zScore: number;
  conclusion: string;
  points: BacktestPoint[];
}
