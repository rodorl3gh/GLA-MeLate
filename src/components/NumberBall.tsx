type Variant = "natural" | "adicional" | "hot" | "cold" | "overdue" | "muted";

const SIZES: Record<string, string> = {
  xs: "h-8 w-8 text-[11px]",
  sm: "h-10 w-10 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-14 w-14 text-lg",
};

const VARIANTS: Record<Variant, string> = {
  natural:
    "bg-gradient-to-br from-violet-500/25 to-purple-600/10 border-violet-400/50 text-violet-100",
  adicional:
    "bg-gradient-to-br from-amber-500/25 to-orange-600/10 border-amber-400/60 text-amber-100",
  hot: "bg-gradient-to-br from-red-500/25 to-rose-600/10 border-red-400/50 text-red-100",
  cold: "bg-gradient-to-br from-blue-500/25 to-cyan-600/10 border-blue-400/50 text-blue-100",
  overdue:
    "bg-gradient-to-br from-orange-500/25 to-amber-600/10 border-orange-400/50 text-orange-100",
  muted: "bg-obsidian-800/80 border-obsidian-600/60 text-text-secondary",
};

export default function NumberBall({
  value,
  variant = "natural",
  size = "sm",
  delay = 0,
  title,
}: {
  value: number;
  variant?: Variant;
  size?: keyof typeof SIZES;
  delay?: number;
  title?: string;
}) {
  return (
    <span
      title={title}
      style={{ animationDelay: `${delay}ms` }}
      className={`animate-ball inline-flex shrink-0 items-center justify-center rounded-full border font-display font-semibold tabular-nums shadow-lg ${SIZES[size]} ${VARIANTS[variant]}`}
    >
      {String(value).padStart(2, "0")}
    </span>
  );
}
