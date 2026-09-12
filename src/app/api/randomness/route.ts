import { NextRequest, NextResponse } from "next/server";
import { getGameData } from "@/lib/sources";
import { testRandomness } from "@/lib/randomness";
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
    const result = testRandomness(game, data.draws);
    return NextResponse.json({
      ...result,
      source: data.source,
      updatedAt: data.updatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "No se pudo ejecutar el test de aleatoriedad", detail: String(error) },
      { status: 502 }
    );
  }
}
