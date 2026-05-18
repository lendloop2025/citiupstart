import * as React from "react";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

export function ActionCard({
  icon: Icon,
  title,
  description,
  liveLine,
  href,
  ctaLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  liveLine?: string;
  href: string;
  ctaLabel: string;
}) {
  return (
    <Link
      href={href}
      className="card-hover group block bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] p-7 sm:p-8 hover:border-[color-mix(in_srgb,var(--brand)_30%,var(--border))]"
    >
      <div className="flex items-start gap-5">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "var(--brand-soft)" }}
        >
          <Icon size={28} className="text-[var(--brand)]" />
        </div>
        <div className="flex-1">
          <h2 className="text-[var(--text-h2)] font-bold tracking-tight">{title}</h2>
          <p className="mt-2 text-[var(--ink-muted)]">{description}</p>
          {liveLine && (
            <p className="mt-2 italic text-sm text-[var(--ink-subtle)]">{liveLine}</p>
          )}
        </div>
      </div>
      <div className="mt-7">
        <span className="inline-flex w-full items-center justify-center gap-2 h-12 rounded-[var(--radius-sm)] bg-[var(--brand)] text-[var(--brand-fg)] font-semibold transition group-hover:bg-[var(--brand-hover)]">
          {ctaLabel} <ArrowRight size={16} />
        </span>
      </div>
    </Link>
  );
}
