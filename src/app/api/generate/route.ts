import { NextRequest, NextResponse } from "next/server";
import { getGameData } from "@/lib/sources";
import { generateCombos, DISCLAIMER } from "@/lib/generator";
import { getCurrentEra } from "@/lib/statistics";
import type { GameKey, Strategy } from "@/lib/types";

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
  let body: {
    game?: string;
    count?: number;
    strategy?: string;
    window?: number | string;
    includeAdicional?: boolean;
    antiPopularity?: boolean;
  };

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

  const count = Math.max(1, Math.min(12, Number(body.count) || 6));
  const rawWindow = body.window ?? "all";
  const window =
    rawWindow === "all" ? "all" : Math.max(20, Number(rawWindow) || 100);
  const includeAdicional = body.includeAdicional !== false;
  const antiPopularity = body.antiPopularity === true;

  try {
    const data = await getGameData(game);
    const { combos } = generateCombos(game, getCurrentEra(data.draws), {
      count,
      strategy,
      window,
      includeAdicional,
      antiPopularity,
    });

    return NextResponse.json({
      game,
      strategy,
      window,
      antiPopularity,
      generatedAt: new Date().toISOString(),
      nextDraw: data.nextDraw,
      source: data.source,
      combos,
      disclaimer: DISCLAIMER,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "No se pudieron generar las combinaciones", detail: String(error) },
      { status: 502 }
    );
  }
}
