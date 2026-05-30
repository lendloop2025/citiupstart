import * as React from "react";
import Link from "next/link";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "white-ghost"
  | "inverted";
type Size = "sm" | "md" | "lg" | "xl";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius-sm)] transition disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--brand)] text-[var(--brand-fg)] hover:bg-[var(--brand-hover)] shadow-[var(--shadow-sm)]",
  secondary:
    "bg-transparent text-[var(--brand)] border-[1.5px] border-[var(--brand)] hover:bg-[var(--brand-soft)]",
  outline:
    "bg-transparent text-[var(--brand)] border-[1.5px] border-[var(--brand)] hover:bg-[var(--brand-soft)]",
  ghost:
    "bg-transparent text-[var(--ink)] hover:bg-[var(--bg-alt)]",
  danger:
    "bg-[var(--danger)] text-white hover:opacity-90",
  "white-ghost":
    "bg-transparent text-white border-[1.5px] border-white/60 hover:bg-white/10",
  inverted:
    "bg-transparent text-white border-[1.5px] border-white hover:bg-white/10",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-6 text-base",
  xl: "h-14 px-8 text-base",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  pill?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  pill,
  className = "",
  ...props
}: ButtonProps) {
  const radius = pill ? "rounded-[var(--radius-pill)]" : "";
  return (
    <button
      {...props}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${radius} ${className}`}
    />
  );
}

export interface LinkButtonProps {
  href: string;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  pill?: boolean;
  className?: string;
  children: React.ReactNode;
  download?: string | boolean;
  prefetch?: boolean;
  target?: string;
  rel?: string;
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  fullWidth,
  pill,
  className = "",
  children,
  download,
  prefetch,
  target,
  rel,
}: LinkButtonProps) {
  const radius = pill ? "rounded-[var(--radius-pill)]" : "";
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${radius} ${className}`;
  if (download !== undefined) {
    return <a href={href} download={download as any} className={cls}>{children}</a>;
  }
  return <Link href={href} prefetch={prefetch} target={target} rel={rel} className={cls}>{children}</Link>;
}
