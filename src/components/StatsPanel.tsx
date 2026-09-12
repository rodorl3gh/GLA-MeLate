"use client";

import { Flame, Snowflake, Hourglass, BarChart3, Sigma, Hash, CalendarDays } from "lucide-react";
import NumberBall from "./NumberBall";
import type { StatsResult } from "@/lib/types";

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function SectionTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-text-secondary">
      <span className="text-purple-400">{icon}</span>
      {children}
    </h3>
  );
}

function Bar({
  label,
  value,
  max,
  suffix,
  color = "purple",
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  color?: string;
}) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  const colorMap: Record<string, string> = {
    purple: "from-violet-500 to-purple-500",
    blue: "from-blue-500 to-cyan-400",
    green: "from-emerald-500 to-green-400",
    orange: "from-amber-500 to-orange-500",
  };
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 font-mono text-xs text-text-muted">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-obsidian-800">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${colorMap[color] ?? colorMap.purple} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-14 shrink-0 text-right font-mono text-xs text-text-secondary">
        {value.toLocaleString("es-MX")}
        {suffix}
      </span>
    </div>
  );
}

export default function StatsPanel({ stats }: { stats: StatsResult }) {
  const maxCount = Math.max(...stats.numbers.map((n) => n.count), 1);
  const maxHist = Math.max(...stats.sum.histogram.map((h) => h.count), 1);
  const maxParity = Math.max(...stats.parity.distribution.map((p) => p.count), 1);
  const maxDecade = Math.max(...stats.decades.map((d) => d.count), 1);
  const maxPair = Math.max(...stats.pairs.map((p) => p.count), 1);

  return (
    <div className="space-y-5">
      <div className="glass-card p-5">
        <SectionTitle icon={<Hash size={15} />}>Mapa de calor · frecuencia por número</SectionTitle>
        <div className="grid grid-cols-8 gap-1.5">
          {stats.numbers.map((n) => {
            const intensity = n.count / maxCount;
            return (
              <div
                key={n.n}
                title={`${n.n}: ${n.count} apariciones · atraso ${n.gap} · ratio ${n.overdue.toFixed(2)}`}
                className="group relative flex aspect-square flex-col items-center justify-center rounded-lg border text-center transition-all duration-300 hover:scale-110"
                style={{
                  backgroundColor: `rgba(139, 92, 246, ${0.06 + intensity * 0.75})`,
                  borderColor: `rgba(139, 92, 246, ${0.15 + intensity * 0.6})`,
                }}
              >
                <span className="font-display text-xs font-semibold text-white/90">
                  {n.n}
                </span>
                <span className="font-mono text-[9px] leading-none text-white/60">
                  {n.count}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-text-muted">
          <span>Menos frecuente</span>
          <div className="h-2 flex-1 rounded-full bg-gradient-to-r from-obsidian-700 to-purple-500" />
          <span>Más frecuente</span>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="glass-card p-5">
          <SectionTitle icon={<Flame size={15} />}>Calientes</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {stats.hot.map((n, i) => (
              <NumberBall key={n} value={n} variant="hot" size="xs" delay={i * 40} />
            ))}
          </div>
        </div>
        <div className="glass-card p-5">
          <SectionTitle icon={<Snowflake size={15} />}>Fríos</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {stats.cold.map((n, i) => (
              <NumberBall key={n} value={n} variant="cold" size="xs" delay={i * 40} />
            ))}
          </div>
        </div>
        <div className="glass-card p-5">
          <SectionTitle icon={<Hourglass size={15} />}>Más atrasados</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {stats.overdueNumbers.map((n, i) => (
              <NumberBall key={n} value={n} variant="overdue" size="xs" delay={i * 40} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="glass-card p-5">
          <SectionTitle icon={<Sigma size={15} />}>Distribución de sumas</SectionTitle>
          <div className="space-y-1.5">
            {stats.sum.histogram.map((h) => (
              <Bar
                key={h.sum}
                label={`${h.sum}`}
                value={h.count}
                max={maxHist}
                color="green"
              />
            ))}
          </div>
          <p className="mt-3 font-mono text-[11px] text-text-muted">
            Rango habitual: {stats.sum.commonRange[0]} – {stats.sum.commonRange[1]} · media{" "}
            {stats.sum.mean.toFixed(1)} ± {stats.sum.std.toFixed(1)}
          </p>
        </div>

        <div className="space-y-5">
          <div className="glass-card p-5">
            <SectionTitle icon={<BarChart3 size={15} />}>Paridad (impares)</SectionTitle>
            <div className="space-y-1.5">
              {stats.parity.distribution.map((p) => (
                <Bar
                  key={p.odds}
                  label={`${p.odds} imp`}
                  value={p.count}
                  max={maxParity}
                  color="orange"
                />
              ))}
            </div>
            <p className="mt-3 font-mono text-[11px] text-text-muted">
              Más común: {stats.parity.mostCommon} impares y {6 - stats.parity.mostCommon} pares
            </p>
          </div>

          <div className="glass-card p-5">
            <SectionTitle icon={<BarChart3 size={15} />}>Decenas</SectionTitle>
            <div className="space-y-1.5">
              {stats.decades.map((d) => (
                <Bar
                  key={d.label}
                  label={d.label}
                  value={d.count}
                  max={maxDecade}
                  suffix={` (${(d.pct * 100).toFixed(0)}%)`}
                  color="blue"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="glass-card p-5">
          <SectionTitle icon={<Hash size={15} />}>Pares más frecuentes</SectionTitle>
          <div className="space-y-2">
            {stats.pairs.map((p) => (
              <div key={`${p.a}-${p.b}`} className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <NumberBall value={p.a} size="xs" variant="muted" />
                  <NumberBall value={p.b} size="xs" variant="muted" />
                </div>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-obsidian-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400"
                    style={{ width: `${(p.count / maxPair) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right font-mono text-xs text-text-secondary">
                  {p.count}×
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <SectionTitle icon={<CalendarDays size={15} />}>Por día de sorteo</SectionTitle>
          <div className="space-y-2">
            {stats.weekday.map((w) => (
              <div
                key={w.weekday}
                className="flex items-center justify-between rounded-xl border border-obsidian-600/40 bg-obsidian-800/40 px-4 py-2.5"
              >
                <span className="font-display text-sm text-text-primary">
                  {WEEKDAYS[w.weekday]}
                </span>
                <span className="font-mono text-xs text-text-muted">
                  {w.count} sorteos · suma media {w.avgSum.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-obsidian-600/40 bg-obsidian-800/40 px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-wide text-text-muted">
                Consecutivos
              </p>
              <p className="font-display text-lg text-purple-300">
                {(stats.consecutive.withConsecutivePct * 100).toFixed(0)}%
              </p>
              <p className="text-[10px] text-text-muted">de sorteos con números seguidos</p>
            </div>
            <div className="rounded-xl border border-obsidian-600/40 bg-obsidian-800/40 px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-wide text-text-muted">
                Repetición
              </p>
              <p className="font-display text-lg text-purple-300">
                {stats.repeats.avg.toFixed(2)}
              </p>
              <p className="text-[10px] text-text-muted">números repetidos vs. sorteo previo</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
