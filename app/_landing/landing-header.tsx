"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

const NAV = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#for-borrowers", label: "For borrowers" },
  { href: "#for-lenders", label: "For lenders" },
  { href: "#security", label: "Security" },
  { href: "#faq", label: "FAQ" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 80);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onDark = !scrolled;

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 transition-colors"
      style={{
        height: 72,
        background: scrolled ? "rgba(251,250,247,0.92)" : "transparent",
        backdropFilter: scrolled ? "saturate(180%) blur(12px)" : undefined,
        WebkitBackdropFilter: scrolled ? "saturate(180%) blur(12px)" : undefined,
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        boxShadow: scrolled ? "var(--shadow-sm)" : "none",
      }}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-full flex items-center justify-between gap-6">
        <Link href="/" className="flex flex-col leading-none">
          <span
            className="font-bold text-[18px]"
            style={{ color: onDark ? "var(--ink-dark-fg)" : "var(--ink)" }}
          >
            121.ai
          </span>
          <span
            className="text-[11px] font-medium tracking-wide"
            style={{ color: onDark ? "rgba(251,250,247,0.55)" : "var(--ink-subtle)" }}
          >
            by LendLoop
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="transition-colors"
              style={{
                color: onDark ? "rgba(251,250,247,0.75)" : "var(--ink-muted)",
              }}
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/login"
            className="px-4 h-10 inline-flex items-center rounded-[var(--radius-pill)] text-sm font-semibold transition"
            style={{
              color: onDark ? "var(--ink-dark-fg)" : "var(--ink)",
            }}
          >
            Sign in
          </Link>
          <LinkButton href="/register" variant="primary" size="sm" pill>
            Get started
          </LinkButton>
        </div>

        <button
          aria-label={open ? "Close menu" : "Open menu"}
          className="md:hidden p-2 rounded-md"
          style={{ color: onDark ? "var(--ink-dark-fg)" : "var(--ink)" }}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div
          className="md:hidden border-t border-[var(--border)] bg-[var(--bg)]"
          onClick={() => setOpen(false)}
        >
          <div className="px-6 py-4 space-y-2">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="block py-2 text-sm font-medium text-[var(--ink-muted)]"
              >
                {n.label}
              </a>
            ))}
            <div className="pt-2 flex gap-2">
              <LinkButton href="/login" variant="outline" size="sm" pill fullWidth>
                Sign in
              </LinkButton>
              <LinkButton href="/register" variant="primary" size="sm" pill fullWidth>
                Get started
              </LinkButton>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
