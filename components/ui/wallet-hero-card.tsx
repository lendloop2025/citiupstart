import * as React from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, ArrowUp, ArrowDown } from "lucide-react";
import { formatEur } from "@/lib/utils";

type Metric = { label: string; value: number };

export function WalletHeroCard({
  totalCents,
  deltaCents = 0,
  deltaPct,
  metrics,
  depositHref = "/deposit",
  withdrawHref = "/transactions",
}: {
  totalCents: number;
  deltaCents?: number;
  deltaPct?: number;
  metrics: Metric[];
  depositHref?: string;
  withdrawHref?: string;
}) {
  const positive = deltaCents >= 0;
  return (
    <section
      className="relative overflow-hidden rounded-[var(--radius-lg)] p-6 sm:p-8 text-[var(--ink-dark-fg)]"
      style={{
        background: "var(--ink-dark-bg)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div aria-hidden className="absolute inset-0 bg-grid-dark opacity-50" />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(700px 400px at 100% 0%, rgba(30,64,255,0.20), transparent 60%)",
        }}
      />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="text-[12px] font-medium uppercase tracking-[0.14em] text-white/70">
          Total balance
        </div>
        <div className="flex gap-2">
          <Link
            href={depositHref}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[var(--radius-pill)] text-sm font-semibold border border-white/40 text-white hover:bg-white/10 transition"
          >
            <ArrowDownToLine size={14} /> Deposit
          </Link>
          <Link
            href={withdrawHref}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[var(--radius-pill)] text-sm font-semibold border border-white/40 text-white hover:bg-white/10 transition"
          >
            <ArrowUpFromLine size={14} /> Withdraw
          </Link>
        </div>
      </div>

      <div className="relative mt-3 flex items-baseline gap-4 flex-wrap">
        <div className="text-[44px] sm:text-[56px] leading-none font-bold tabular tracking-tight">
          {formatEur(totalCents)}
        </div>
        {(deltaCents !== 0 || deltaPct !== undefined) && (
          <div
            className="inline-flex items-center gap-1 text-sm font-semibold tabular"
            style={{ color: positive ? "var(--success)" : "var(--danger)" }}
          >
            {positive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            {positive ? "+" : ""}{formatEur(deltaCents)}
            {deltaPct !== undefined && (
              <span className="text-white/60 font-normal">
                ({positive ? "+" : ""}
                {deltaPct.toFixed(2)}%) this month
              </span>
            )}
          </div>
        )}
      </div>

      <div
        className="relative mt-7 pt-6 grid grid-cols-2 sm:grid-cols-4 gap-6 border-t"
        style={{ borderColor: "rgba(255,255,255,0.12)" }}
      >
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="text-[11px] uppercase tracking-[0.12em]" style={{ color: "rgba(251,250,247,0.6)" }}>
              {m.label}
            </div>
            <div className="mt-1.5 text-[var(--text-h3)] font-semibold tabular">
              {formatEur(m.value)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
