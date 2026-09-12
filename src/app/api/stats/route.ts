import { NextRequest, NextResponse } from "next/server";
import { getGameData } from "@/lib/sources";
import { computeStats, getCurrentEra } from "@/lib/statistics";
import type { GameKey } from "@/lib/types";

export const dynamic = "force-dynamic";

const GAMES: GameKey[] = ["melate", "revancha", "revanchita"];

export async function GET(req: NextRequest) {
  const game = (req.nextUrl.searchParams.get("game") ?? "melate") as GameKey;
  if (!GAMES.includes(game)) {
    return NextResponse.json({ error: "Juego inválido" }, { status: 400 });
  }

  const windowParam = req.nextUrl.searchParams.get("window") ?? "all";
  const window = windowParam === "all" ? "all" : Math.max(20, Number(windowParam) || 100);

  try {
    const data = await getGameData(game);
    const stats = computeStats(game, getCurrentEra(data.draws), window);
    return NextResponse.json({
      ...stats,
      source: data.source,
      updatedAt: data.updatedAt,
      nextDraw: data.nextDraw,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "No se pudieron calcular las estadísticas", detail: String(error) },
      { status: 502 }
    );
  }
}
