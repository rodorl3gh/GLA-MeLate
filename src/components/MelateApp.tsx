"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Loader2,
  Dices,
  TrendingUp,
  Snowflake,
  Scale,
  Shuffle,
  Copy,
  Check,
  Database,
  Clock,
  AlertTriangle,
  CalendarClock,
  History,
  Minus,
  Plus,
  Target,
  Fingerprint,
  FlaskConical,
} from "lucide-react";
import NumberBall from "./NumberBall";
import StatsPanel from "./StatsPanel";
import AnalysisPanel from "./AnalysisPanel";
import type {
  DataSource,
  Draw,
  GameKey,
  GeneratedCombo,
  StatsResult,
  Strategy,
} from "@/lib/types";

type WindowValue = "all" | number;

interface DataResponse {
  game: GameKey;
  source: DataSource;
  updatedAt: string;
  nextDraw: string;
  totalDraws: number;
  latest: Draw[];
  recent: Draw[];
}

const GAMES: { key: GameKey; label: string }[] = [
  { key: "melate", label: "Melate" },
  { key: "revancha", label: "Revancha" },
  { key: "revanchita", label: "Revanchita" },
];

const STRATEGIES: {
  key: Strategy;
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "estadistica",
    label: "Estadística",
    desc: "Combina frecuencia, atraso y sinergia de pares",
    icon: <Sparkles size={15} />,
  },
  {
    key: "balanceada",
    label: "Balanceada",
    desc: "Equilibrio entre números calientes y fríos",
    icon: <Scale size={15} />,
  },
  {
    key: "calientes",
    label: "Calientes",
    desc: "Favorece los más frecuentes recientes",
    icon: <TrendingUp size={15} />,
  },
  {
    key: "frias",
    label: "Fríos",
    desc: "Favorece los más atrasados",
    icon: <Snowflake size={15} />,
  },
  {
    key: "aleatoria",
    label: "Aleatoria",
    desc: "Muestra uniforme sin sesgo estadístico",
    icon: <Shuffle size={15} />,
  },
];

const WINDOWS: { value: WindowValue; label: string }[] = [
  { value: "all", label: "Era actual (1-56)" },
  { value: 500, label: "Últimos 500" },
  { value: 200, label: "Últimos 200" },
  { value: 100, label: "Últimos 100" },
  { value: 50, label: "Últimos 50" },
];

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function formatDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export default function MelateApp() {
  const [game, setGame] = useState<GameKey>("melate");
  const [strategy, setStrategy] = useState<Strategy>("estadistica");
  const [windowValue, setWindowValue] = useState<WindowValue>("all");
  const [count, setCount] = useState(6);
  const [includeAdicional, setIncludeAdicional] = useState(true);
  const [antiPopularity, setAntiPopularity] = useState(true);

  const [data, setData] = useState<DataResponse | null>(null);
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [combos, setCombos] = useState<GeneratedCombo[]>([]);
  const [disclaimer, setDisclaimer] = useState("");

  const [loadingData, setLoadingData] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const supportsAdicional = game === "melate";

  useEffect(() => {
    let active = true;
    setLoadingData(true);
    setError(null);
    setCombos([]);
    getJson<DataResponse>(`/api/data?game=${game}`)
      .then((res) => {
        if (!active) return;
        setData(res);
      })
      .catch(() => active && setError("No se pudieron cargar los resultados históricos."))
      .finally(() => active && setLoadingData(false));
    return () => {
      active = false;
    };
  }, [game]);

  useEffect(() => {
    let active = true;
    setLoadingStats(true);
    getJson<StatsResult>(`/api/stats?game=${game}&window=${windowValue}`)
      .then((res) => {
        if (!active) return;
        setStats(res);
      })
      .catch(() => active && setError("No se pudieron calcular las estadísticas."))
      .finally(() => active && setLoadingStats(false));
    return () => {
      active = false;
    };
  }, [game, windowValue]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game,
          strategy,
          window: windowValue,
          count,
          includeAdicional: includeAdicional && supportsAdicional,
          antiPopularity,
        }),
      });
      if (!res.ok) throw new Error("Error al generar");
      const json = (await res.json()) as {
        combos: GeneratedCombo[];
        disclaimer: string;
      };
      setCombos(json.combos);
      setDisclaimer(json.disclaimer);
    } catch {
      setError("No se pudieron generar las combinaciones. Intenta de nuevo.");
    } finally {
      setGenerating(false);
    }
  }, [
    game,
    strategy,
    windowValue,
    count,
    includeAdicional,
    supportsAdicional,
    antiPopularity,
  ]);

  const copyCombo = useCallback((combo: GeneratedCombo, index: number) => {
    const text =
      combo.numbers.map((n) => String(n).padStart(2, "0")).join(" ") +
      (combo.adicional ? ` + ${String(combo.adicional).padStart(2, "0")}` : "");
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(index);
      setTimeout(() => setCopied((c) => (c === index ? null : c)), 1600);
    });
  }, []);

  const maxScore = useMemo(
    () => Math.max(...combos.map((c) => c.score), 0.0001),
    [combos]
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.12),transparent_55%)]" />
      <div className="pointer-events-none absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-blue-600/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-1/2 h-96 w-96 rounded-full bg-emerald-600/5 blur-3xl" />

      <header className="relative z-10 border-b border-obsidian-600/40 bg-obsidian-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10 font-display text-lg font-bold text-purple-300">
              GLA
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight">
                MeLate <span className="gradient-text-purple">Analytics</span>
              </h1>
              <p className="text-xs text-text-muted">
                Generador estadístico de combinaciones · Lotería Nacional
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-obsidian-600/50 bg-obsidian-800/60 px-3 py-1.5 text-text-secondary">
              <CalendarClock size={13} className="text-purple-400" />
              Próximo sorteo: {data ? formatDate(data.nextDraw) : "—"}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${
                data?.source === "live"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              }`}
            >
              <Database size={13} />
              {data?.source === "live" ? "Datos en vivo" : "Datos de respaldo"}
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {GAMES.map((g) => (
            <button
              key={g.key}
              onClick={() => setGame(g.key)}
              className={`rounded-xl border px-4 py-2 font-display text-sm font-semibold transition-all duration-300 ${
                game === g.key
                  ? "border-purple-500/50 bg-purple-500/15 text-purple-200"
                  : "border-obsidian-600/50 bg-obsidian-900/60 text-text-secondary hover:border-obsidian-500 hover:text-text-primary"
              }`}
            >
              {g.label}
            </button>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-2 font-mono text-[11px] text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <History size={12} /> {data?.totalDraws.toLocaleString("es-MX") ?? "—"} sorteos
            </span>
            {data && (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={12} /> Actualizado {formatDate(data.updatedAt.slice(0, 10))}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <section className="glass-card mb-6 p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <span className="section-badge bg-purple-500/10 text-purple-300">
              <Target size={13} /> Configura tu jugada
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div>
              <p className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Estrategia estadística
              </p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {STRATEGIES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setStrategy(s.key)}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-300 hover:scale-[1.02] ${
                      strategy === s.key
                        ? "border-purple-500/50 bg-purple-500/10"
                        : "border-obsidian-600/50 bg-obsidian-800/40 hover:border-obsidian-500"
                    }`}
                  >
                    <span
                      className={`mt-0.5 ${
                        strategy === s.key ? "text-purple-300" : "text-obsidian-400"
                      }`}
                    >
                      {s.icon}
                    </span>
                    <span>
                      <span className="block font-display text-sm font-semibold text-text-primary">
                        {s.label}
                      </span>
                      <span className="block text-[11px] leading-snug text-text-muted">
                        {s.desc}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Ventana de análisis
                </p>
                <select
                  value={String(windowValue)}
                  onChange={(e) =>
                    setWindowValue(e.target.value === "all" ? "all" : Number(e.target.value))
                  }
                  className="w-full rounded-xl border border-obsidian-600/60 bg-obsidian-800/60 px-3 py-2.5 font-body text-sm text-text-primary outline-none transition focus:border-purple-500/60"
                >
                  {WINDOWS.map((w) => (
                    <option key={String(w.value)} value={String(w.value)}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Combinaciones
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCount((c) => Math.max(1, c - 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-obsidian-600/60 bg-obsidian-800/60 text-text-secondary transition hover:border-purple-500/50 hover:text-text-primary"
                    >
                      <Minus size={15} />
                    </button>
                    <span className="w-10 text-center font-display text-xl font-bold tabular-nums">
                      {count}
                    </span>
                    <button
                      onClick={() => setCount((c) => Math.min(12, c + 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-obsidian-600/60 bg-obsidian-800/60 text-text-secondary transition hover:border-purple-500/50 hover:text-text-primary"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-xs transition ${
                      supportsAdicional
                        ? "border-obsidian-600/60 bg-obsidian-800/60 text-text-secondary hover:border-obsidian-500"
                        : "cursor-not-allowed border-obsidian-700/50 bg-obsidian-900/40 text-obsidian-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={includeAdicional && supportsAdicional}
                      disabled={!supportsAdicional}
                      onChange={(e) => setIncludeAdicional(e.target.checked)}
                      className="h-4 w-4 accent-purple-500"
                    />
                    Incluir número adicional
                  </label>

                  <label
                    className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-xs transition ${
                      antiPopularity
                        ? "border-purple-500/40 bg-purple-500/10 text-text-secondary"
                        : "border-obsidian-600/60 bg-obsidian-800/60 text-text-secondary hover:border-obsidian-500"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={antiPopularity}
                      onChange={(e) => setAntiPopularity(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-purple-500"
                    />
                    <span>
                      <span className="flex items-center gap-1.5 font-display font-semibold text-text-primary">
                        <Fingerprint size={13} className="text-purple-300" />
                        Modo anti-popularidad
                      </span>
                      <span className="mt-0.5 block text-[10px] leading-snug text-text-muted">
                        Evita fechas y números muy jugados para no compartir el premio.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || loadingData}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-purple-500/40 bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-4 font-display text-base font-bold text-white shadow-lg shadow-purple-900/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-purple-700/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Analizando histórico…
                  </>
                ) : (
                  <>
                    <Sparkles size={18} className="transition-transform group-hover:rotate-12" />
                    Generar números
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-text-muted">
                Objetivo: sorteo del {data ? formatDate(data.nextDraw) : "—"} (mié · vie · dom)
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="section-badge bg-blue-500/10 text-blue-300">
              <Dices size={13} /> Combinaciones generadas
            </span>
          </div>

          {combos.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10 text-purple-300">
                <Dices size={24} />
              </div>
              <p className="font-display text-base font-semibold">
                Aún no has generado números
              </p>
              <p className="max-w-md text-sm text-text-muted">
                Elige una estrategia y presiona <span className="text-purple-300">Generar números</span>.
                El sistema descargará el histórico oficial y calculará las combinaciones más
                coherentes con las estadísticas.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {combos.map((combo, index) => (
                <div
                  key={`${combo.numbers.join("-")}-${index}`}
                  className="glass-card animate-fade-in-up p-4 hover:border-purple-500/40"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                      Jugada #{index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 font-mono text-[10px] text-purple-300">
                        Score {(combo.score * 100).toFixed(1)}
                      </span>
                      <button
                        onClick={() => copyCombo(combo, index)}
                        title="Copiar combinación"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-obsidian-600/60 bg-obsidian-800/60 text-text-muted transition hover:border-purple-500/50 hover:text-purple-300"
                      >
                        {copied === index ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {combo.numbers.map((n, i) => (
                      <NumberBall key={n} value={n} variant="natural" size="md" delay={i * 60} />
                    ))}
                    {combo.adicional && (
                      <>
                        <span className="mx-1 text-text-muted">+</span>
                        <NumberBall
                          value={combo.adicional}
                          variant="adicional"
                          size="md"
                          delay={360}
                        />
                      </>
                    )}
                  </div>

                  <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-obsidian-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400"
                      style={{ width: `${(combo.score / maxScore) * 100}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5 font-mono text-[10px] text-text-muted">
                    <span className="rounded-md border border-obsidian-600/50 bg-obsidian-800/50 px-2 py-0.5">
                      suma {combo.metrics.sum}
                    </span>
                    <span className="rounded-md border border-obsidian-600/50 bg-obsidian-800/50 px-2 py-0.5">
                      {combo.metrics.odds} imp / {6 - combo.metrics.odds} par
                    </span>
                    <span className="rounded-md border border-obsidian-600/50 bg-obsidian-800/50 px-2 py-0.5">
                      {combo.metrics.overdueHits} atrasados
                    </span>
                    <span className="rounded-md border border-obsidian-600/50 bg-obsidian-800/50 px-2 py-0.5">
                      {combo.metrics.hotHits} calientes
                    </span>
                    <span
                      className={`rounded-md border px-2 py-0.5 ${
                        combo.metrics.popularity < 0.4
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-obsidian-600/50 bg-obsidian-800/50"
                      }`}
                      title="Popularidad estimada entre los jugadores (menor = menos compartido)"
                    >
                      popularidad {Math.round(combo.metrics.popularity * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="section-badge bg-emerald-500/10 text-emerald-300">
              <TrendingUp size={13} /> Análisis estadístico
            </span>
            {stats && (
              <span className="font-mono text-[11px] text-text-muted">{stats.windowLabel}</span>
            )}
          </div>

          {loadingStats || !stats ? (
            <div className="glass-card flex items-center justify-center gap-3 p-12 text-text-muted">
              <Loader2 size={18} className="animate-spin" />
              Calculando estadísticas…
            </div>
          ) : (
            <StatsPanel stats={stats} />
          )}
        </section>

        <section className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="section-badge bg-pink-500/10 text-pink-300">
              <FlaskConical size={13} /> Rigor estadístico
            </span>
            <span className="font-mono text-[11px] text-text-muted">
              validación sin fuga de información
            </span>
          </div>
          <AnalysisPanel
            game={game}
            windowValue={windowValue}
            strategy={strategy}
            antiPopularity={antiPopularity}
          />
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="section-badge bg-orange-500/10 text-orange-300">
              <History size={13} /> Últimos sorteos
            </span>
          </div>

          <div className="glass-card overflow-hidden">
            {loadingData || !data ? (
              <div className="flex items-center justify-center gap-3 p-12 text-text-muted">
                <Loader2 size={18} className="animate-spin" />
                Cargando histórico…
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-obsidian-600/50 text-[11px] uppercase tracking-wider text-text-muted">
                      <th className="px-4 py-3 font-medium">Sorteo</th>
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium">Día</th>
                      <th className="px-4 py-3 font-medium">Combinación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((draw) => (
                      <tr
                        key={draw.concurso}
                        className="border-b border-obsidian-700/40 transition hover:bg-obsidian-800/40"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-text-secondary">
                          #{draw.concurso}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-text-secondary">
                          {formatDate(draw.date)}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-text-muted">
                          {WEEKDAYS[draw.weekday]}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {draw.numbers.map((n) => (
                              <NumberBall key={n} value={n} size="xs" variant="muted" />
                            ))}
                            {draw.adicional && (
                              <>
                                <span className="text-xs text-text-muted">+</span>
                                <NumberBall
                                  value={draw.adicional}
                                  size="xs"
                                  variant="adicional"
                                />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-obsidian-600/40 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="flex items-center justify-center gap-2 text-xs text-amber-300/90">
            <AlertTriangle size={14} />
            Aviso importante
          </p>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">
            {disclaimer ||
              "Las combinaciones se generan con un modelo estadístico heurístico sobre resultados históricos oficiales de la Lotería Nacional. Los sorteos son eventos aleatorios: ninguna estadística aumenta la probabilidad real de ganar. Juega con responsabilidad."}
          </p>
          <p className="mt-4 font-mono text-[11px] text-obsidian-400">
            GLA · MeLate Analytics — datos: pronosticos.gob.mx
          </p>
        </div>
      </footer>
    </div>
  );
}
