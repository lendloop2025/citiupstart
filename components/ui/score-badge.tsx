type Tier = "high" | "mid" | "low" | "muted";

function tierFor(score: number | null): Tier {
  if (score === null) return "muted";
  if (score >= 80) return "high";
  if (score >= 60) return "mid";
  return "low";
}

const tierClass: Record<Tier, string> = {
  high: "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]",
  mid:  "bg-[color-mix(in_srgb,var(--warning)_18%,transparent)] text-[#9b6500]",
  low:  "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]",
  muted:"bg-[var(--bg-alt)] text-[var(--ink-muted)]",
};

export function ScoreBadge({
  score,
  withDots = true,
  size = "md",
}: Readonly<{ score: number | null | undefined; withDots?: boolean; size?: "sm" | "md" }>) {
  const s = typeof score === "number" ? score : null;
  const tier = tierFor(s);
  const filled = s === null ? 0 : Math.round((s / 100) * 5);
  return (
    <div className={`inline-flex items-center gap-2 px-3 ${size === "sm" ? "h-7 text-[12px]" : "h-8 text-[13px]"} rounded-[var(--radius-pill)] font-semibold tabular ${tierClass[tier]}`}>
      <span>{s ?? "—"}</span>
      {withDots && s !== null && (
        <span className="flex gap-0.5">
          {[0, 1, 2, 3, 4].map(i => (
            <span key={i} className={`block w-1.5 h-1.5 rounded-full ${i < filled ? "bg-current" : "bg-current opacity-25"}`} />
          ))}
        </span>
      )}
    </div>
  );
}
