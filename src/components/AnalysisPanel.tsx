"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Play,
  ShieldCheck,
  Target,
} from "lucide-react";
import NumberBall from "./NumberBall";
import type {
  BacktestResponse,
  GameKey,
  RandomnessResult,
  Strategy,
} from "@/lib/types";

type WindowValue = "all" | number;

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function Card({
  icon,
  title,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-text-secondary">
          <span className="text-purple-400">{icon}</span>
          {title}
        </h3>
        {badge}
      </div>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent = "purple",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "purple" | "green" | "blue" | "orange";
}) {
  const colors: Record<string, string> = {
    purple: "text-purple-300",
    green: "text-emerald-300",
    blue: "text-blue-300",
    orange: "text-orange-300",
  };
  return (
    <div className="rounded-xl border border-obsidian-600/40 bg-obsidian-800/40 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-wide text-text-muted">{label}</p>
      <p className={`font-display text-xl font-bold tabular-nums ${colors[accent]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] leading-snug text-text-muted">{hint}</p>}
    </div>
  );
}

export default function AnalysisPanel({
  game,
  windowValue,
  strategy,
  antiPopularity,
}: {
  game: GameKey;
  windowValue: WindowValue;
  strategy: Strategy;
  antiPopularity: boolean;
}) {
  const [randomness, setRandomness] = useState<RandomnessResult | null>(null);
  const [loadingRand, setLoadingRand] = useState(true);

  const [drawsToTest, setDrawsToTest] = useState(120);
  const [backtest, setBacktest] = useState<BacktestResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingRand(true);
    setRandomness(null);
    fetch(`/api/randomness?game=${game}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("error"))))
      .then((res: RandomnessResult) => active && setRandomness(res))
      .catch(() => active && setError("No se pudo ejecutar el test de aleatoriedad."))
      .finally(() => active && setLoadingRand(false));
    return () => {
      active = false;
    };
  }, [game]);

  useEffect(() => {
    setBacktest(null);
  }, [game]);

  const runBacktest = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game,
          strategy,
          window: windowValue,
          antiPopularity,
          drawsToTest,
          combosPerDraw: 1,
        }),
      });
      if (!res.ok) throw new Error("error");
      const json = (await res.json()) as BacktestResponse;
      setBacktest(json);
    } catch {
      setError("No se pudo ejecutar el backtest. Intenta de nuevo.");
    } finally {
      setRunning(false);
    }
  }, [game, strategy, windowValue, antiPopularity, drawsToTest]);

  const maxDist = backtest
    ? Math.max(...backtest.strategyHitDist, ...backtest.randomHitDist, 1)
    : 1;

  return (
    <div className="space-y-5">
      <Card
        icon={<ShieldCheck size={15} />}
        title="Test de aleatoriedad (chi-cuadrado)"
        badge={
          randomness ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                randomness.uniform
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              }`}
            >
              {randomness.uniform ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
              {randomness.uniform ? "Uniforme" : "Revisar"}
            </span>
          ) : undefined
        }
      >
        {loadingRand || !randomness ? (
          <div className="flex items-center justify-center gap-3 py-8 text-text-muted">
            <Loader2 size={16} className="animate-spin" />
            Calculando test…
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Chi-cuadrado"
                value={randomness.chiSquare.toFixed(1)}
                hint={`gl = ${randomness.degreesOfFreedom}`}
              />
              <Stat
                label="p-valor"
                value={randomness.pValue.toFixed(4)}
                accent={randomness.uniform ? "green" : "orange"}
                hint={randomness.uniform ? "> 0.05" : "≤ 0.05"}
              />
              <Stat
                label="Sorteos analizados"
                value={randomness.totalDraws.toLocaleString("es-MX")}
                accent="blue"
              />
              <Stat
                label="Esperado por número"
                value={randomness.expectedPerNumber.toFixed(1)}
                accent="blue"
                hint="apariciones teóricas"
              />
            </div>
            <p className="mt-3 font-mono text-[11px] text-text-muted">
              Era 1-56 desde el sorteo #{randomness.eraStart} ({formatDate(randomness.eraStartDate)}).
              El Melate cambió de matriz (6/44 → 6/50 → 6/56), por eso no se mezcla todo el histórico.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {randomness.verdict}
            </p>
            <div className="mt-4">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-text-muted">
                Mayores desviaciones (observado − esperado)
              </p>
              <div className="space-y-1.5">
                {[...randomness.observations]
                  .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
                  .slice(0, 6)
                  .map((o) => {
                    const maxDev = Math.max(
                      ...randomness.observations.map((x) => Math.abs(x.deviation)),
                      1
                    );
                    const pct = (Math.abs(o.deviation) / maxDev) * 100;
                    return (
                      <div key={o.n} className="flex items-center gap-3">
                        <NumberBall value={o.n} size="xs" variant="muted" />
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-obsidian-800">
                          <div
                            className={`h-full rounded-full ${
                              o.deviation >= 0
                                ? "bg-gradient-to-r from-emerald-500 to-green-400"
                                : "bg-gradient-to-r from-red-500 to-rose-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-16 text-right font-mono text-xs text-text-secondary">
                          {o.deviation >= 0 ? "+" : ""}
                          {o.deviation.toFixed(0)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </>
        )}
      </Card>

      <Card
        icon={<FlaskConical size={15} />}
        title="Backtesting contra el azar"
        badge={
          <div className="flex items-center gap-2">
            <select
              value={drawsToTest}
              onChange={(e) => setDrawsToTest(Number(e.target.value))}
              className="rounded-lg border border-obsidian-600/60 bg-obsidian-800/60 px-2 py-1.5 text-xs text-text-primary outline-none focus:border-purple-500/60"
            >
              <option value={50}>50 sorteos</option>
              <option value={120}>120 sorteos</option>
              <option value={200}>200 sorteos</option>
              <option value={300}>300 sorteos</option>
            </select>
            <button
              onClick={runBacktest}
              disabled={running}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/15 px-3 py-1.5 font-display text-xs font-semibold text-purple-200 transition hover:scale-[1.03] hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              {running ? "Evaluando…" : "Ejecutar backtest"}
            </button>
          </div>
        }
      >
        {!backtest ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Activity size={22} className="text-purple-400" />
            <p className="text-sm text-text-secondary">
              Evalúa la estrategia <span className="text-purple-300">{strategy}</span> sobre
              sorteos pasados y compárala contra combinaciones aleatorias.
            </p>
            <p className="max-w-xl text-xs text-text-muted">
              Usa únicamente el histórico anterior a cada sorteo (sin fuga de información).
              Resultado esperado si el sorteo es justo: la estrategia y el azar empatan.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Promedio estrategia"
                value={backtest.strategyAvg.toFixed(3)}
                accent="purple"
                hint="aciertos por sorteo"
              />
              <Stat
                label="Promedio azar"
                value={backtest.randomAvg.toFixed(3)}
                accent="blue"
                hint="línea base aleatoria"
              />
              <Stat
                label="Teórico"
                value={backtest.theoreticalAvg.toFixed(3)}
                accent="green"
                hint="6 × 6/56"
              />
              <Stat
                label="z-score"
                value={backtest.zScore.toFixed(2)}
                accent={Math.abs(backtest.zScore) < 1.96 ? "green" : "orange"}
                hint={Math.abs(backtest.zScore) < 1.96 ? "sin diferencia" : "revisar"}
              />
            </div>

            <div className="mt-5">
              <p className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-text-muted">
                <BarChart3 size={12} /> Distribución de aciertos (números naturales)
              </p>
              <div className="space-y-2">
                {backtest.strategyHitDist.map((count, matches) => (
                  <div key={matches} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 font-mono text-[11px] text-text-muted">
                      {matches} aciertos
                    </span>
                    <div className="flex flex-1 items-center gap-1">
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-obsidian-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400"
                          style={{ width: `${(count / maxDist) * 100}%` }}
                        />
                      </div>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-obsidian-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                          style={{ width: `${(backtest.randomHitDist[matches] / maxDist) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-20 shrink-0 text-right font-mono text-[11px] text-text-secondary">
                      {count} / {backtest.randomHitDist[matches]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-4 text-[10px] text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-3 rounded-full bg-purple-400" /> Estrategia
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-3 rounded-full bg-cyan-400" /> Azar
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Stat
                label="Mejor acierto"
                value={`${backtest.bestMatch}/6`}
                accent="orange"
              />
              <Stat
                label="Sorteos con ≥3"
                value={`${backtest.drawsWith3Plus}`}
                hint={`azar: ${backtest.randomWith3Plus}`}
                accent="blue"
              />
              <Stat
                label="Sorteos evaluados"
                value={`${backtest.drawsTested}`}
                accent="purple"
                hint={`ventana ${backtest.window === "all" ? "completa" : backtest.window}`}
              />
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-obsidian-600/40 bg-obsidian-800/40 p-4">
              <Target size={15} className="mt-0.5 shrink-0 text-purple-400" />
              <p className="text-sm leading-relaxed text-text-secondary">{backtest.conclusion}</p>
            </div>
          </>
        )}
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}
    </div>
  );
}
