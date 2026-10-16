import type { Draw, GameData, GameKey } from "./types";
import { FALLBACK_CSV } from "./fallback-data";

const ARHP: Record<GameKey, string> = {
  melate: "TQBlAGwAYQB0AGUA",
  revancha: "UgBlAHYAYQBuAGMAaABhAA==",
  revanchita: "UgBlAHYAYQBuAGMAaABpAHQAYQA=",
};

const BASE = "https://www.pronosticos.gob.mx/Home/Historicos?ARHP=";
const TTL = 1000 * 60 * 60 * 6;

const cache = new Map<GameKey, { data: GameData; at: number }>();

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36";

async function fetchLive(game: GameKey): Promise<string> {
  const url = BASE + ARHP[game];
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/csv,*/*" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes("NPRODUCTO")) throw new Error("respuesta inesperada");
  return text;
}

export function parseCsv(text: string): Draw[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().toUpperCase());
  const col = (name: string) => header.indexOf(name);

  // Los encabezados cambian según el juego: Melate/Revancha usan R1..R7 y
  // Revanchita usa F1..F6. Detectamos las columnas de números de forma genérica.
  const numberCols = header
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => /^[RF]\d+$/.test(h))
    .sort((a, b) => Number(a.h.slice(1)) - Number(b.h.slice(1)))
    .map(({ i }) => i);

  const numCols = numberCols.slice(0, 6);
  const addCol = numberCols.length >= 7 ? numberCols[6] : -1;
  const cCol = col("CONCURSO");
  const bCol = col("BOLSA");
  const fCol = col("FECHA");

  const draws: Draw[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",");
    const numbers = numCols
      .map((j) => Number(cells[j]))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (numbers.length < 6) continue;
    numbers.sort((a, b) => a - b);

    const dateParts = (cells[fCol] ?? "").split("/").map(Number);
    const [d, m, y] = dateParts;
    if (!d || !m || !y) continue;

    const draw: Draw = {
      concurso: Number(cells[cCol]) || 0,
      numbers,
      bolsa: Number(cells[bCol]) || 0,
      date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay(),
    };

    if (addCol >= 0) {
      const extra = Number(cells[addCol]);
      if (Number.isFinite(extra) && extra > 0) draw.adicional = extra;
    }

    draws.push(draw);
  }

  draws.sort((a, b) => b.concurso - a.concurso);
  return draws;
}

export function nextDrawDate(from: Date = new Date()): string {
  const drawDays = [0, 3, 5];
  const base = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()));
  for (let i = 0; i < 14; i++) {
    const candidate = new Date(base);
    candidate.setUTCDate(base.getUTCDate() + i);
    if (drawDays.includes(candidate.getUTCDay())) {
      return candidate.toISOString().slice(0, 10);
    }
  }
  return base.toISOString().slice(0, 10);
}

function readFallback(game: GameKey): Draw[] {
  const text = FALLBACK_CSV[game];
  if (!text) throw new Error(`Sin datos de respaldo para ${game}`);
  return parseCsv(text);
}

export async function getGameData(game: GameKey, force = false): Promise<GameData> {
  const now = Date.now();
  const cached = cache.get(game);
  if (!force && cached && now - cached.at < TTL) return cached.data;

  let source: GameData["source"] = "live";
  let draws: Draw[] = [];

  try {
    draws = parseCsv(await fetchLive(game));
  } catch {
    draws = [];
  }

  if (draws.length < 50) {
    source = "fallback";
    try {
      draws = readFallback(game);
    } catch {
      if (draws.length === 0) throw new Error(`No hay datos disponibles para ${game}`);
    }
  }

  const data: GameData = {
    game,
    draws,
    source,
    updatedAt: new Date().toISOString(),
    nextDraw: nextDrawDate(),
  };

  cache.set(game, { data, at: now });
  return data;
}
