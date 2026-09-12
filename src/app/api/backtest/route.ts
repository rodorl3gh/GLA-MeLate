import { NextRequest, NextResponse } from "next/server";
import { getGameData } from "@/lib/sources";
import { runBacktest } from "@/lib/backtest";
import { getCurrentEra } from "@/lib/statistics";
import type { BacktestRequest, GameKey, Strategy } from "@/lib/types";

export const dynamic = "force-dynamic";

const GAMES: GameKey[] = ["melate", "revancha", "revanchita"];
const STRATEGIES: Strategy[] = [
  "estadistica",
  "calientes",
  "frias",
  "balanceada",
  "aleatoria",
];

export async function POST(req: NextRequest) {
  let body: Partial<BacktestRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const game = (body.game ?? "melate") as GameKey;
  if (!GAMES.includes(game)) {
    return NextResponse.json({ error: "Juego inválido" }, { status: 400 });
  }

  const strategy = (body.strategy ?? "estadistica") as Strategy;
  if (!STRATEGIES.includes(strategy)) {
    return NextResponse.json({ error: "Estrategia inválida" }, { status: 400 });
  }

  const rawWindow = body.window ?? "all";
  const window = rawWindow === "all" ? "all" : Math.max(60, Number(rawWindow) || 500);
  const drawsToTest = Math.max(20, Math.min(300, Number(body.drawsToTest) || 120));
  const combosPerDraw = Math.max(1, Math.min(5, Number(body.combosPerDraw) || 1));

  try {
    const data = await getGameData(game);
    const result = runBacktest(game, getCurrentEra(data.draws), {
      game,
      strategy,
      window,
      antiPopularity: body.antiPopularity === true,
      drawsToTest,
      combosPerDraw,
    });
    return NextResponse.json({ ...result, source: data.source });
  } catch (error) {
    return NextResponse.json(
      { error: "No se pudo ejecutar el backtest", detail: String(error) },
      { status: 502 }
    );
  }
}
