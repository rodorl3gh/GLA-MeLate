import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const games = {
  melate: "melate.csv",
  revancha: "revancha.csv",
  revanchita: "revanchita.csv",
};

const out = {};
for (const [key, file] of Object.entries(games)) {
  out[key] = readFileSync(join(root, "data", file), "utf8");
}

const body =
  "// Archivo autogenerado por scripts/gen-fallback.mjs - NO editar a mano.\n" +
  "// Contiene los CSV de respaldo embebidos para que la app funcione sin disco (Cloudflare Workers).\n" +
  "export const FALLBACK_CSV: Record<string, string> = " +
  JSON.stringify(out, null, 2) +
  ";\n";

writeFileSync(join(root, "src", "lib", "fallback-data.ts"), body, "utf8");
console.log("src/lib/fallback-data.ts generado (" + Object.keys(out).length + " juegos)");
