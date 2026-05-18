import * as React from "react";

export function Card({
  className = "",
  hover = false,
  padding = "md",
  elevated = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
  padding?: "sm" | "md" | "lg" | "xl";
  elevated?: boolean;
}) {
  const padMap = {
    sm: "p-4 sm:p-5",
    md: "p-5 sm:p-6",
    lg: "p-6 sm:p-8",
    xl: "p-8 sm:p-10",
  } as const;
  const pad = padMap[padding];
  const shadow = elevated ? "shadow-[var(--shadow-md)]" : "shadow-[var(--shadow-sm)]";
  return (
    <div
      {...props}
      className={`bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] ${shadow} ${hover ? "card-hover hover:border-[color-mix(in_srgb,var(--brand)_30%,var(--border))]" : ""} ${pad} ${className}`}
    />
  );
}
