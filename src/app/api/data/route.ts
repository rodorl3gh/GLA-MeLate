import { NextRequest, NextResponse } from "next/server";
import { getGameData } from "@/lib/sources";
import type { GameKey } from "@/lib/types";

export const dynamic = "force-dynamic";

const GAMES: GameKey[] = ["melate", "revancha", "revanchita"];

export async function GET(req: NextRequest) {
  const game = (req.nextUrl.searchParams.get("game") ?? "melate") as GameKey;
  if (!GAMES.includes(game)) {
    return NextResponse.json({ error: "Juego inválido" }, { status: 400 });
  }

  try {
    const data = await getGameData(game);
    return NextResponse.json({
      game: data.game,
      source: data.source,
      updatedAt: data.updatedAt,
      nextDraw: data.nextDraw,
      totalDraws: data.draws.length,
      latest: data.draws.slice(0, 10),
      recent: data.draws.slice(0, 20),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "No se pudieron obtener los resultados", detail: String(error) },
      { status: 502 }
    );
  }
}
