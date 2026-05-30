import Link from "next/link";
import { requireUserProfile } from "@/lib/auth/session";
import { logoutAction } from "@/app/actions/auth";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { profile } = await requireUserProfile();
  const initial = (profile.first_name?.[0] ?? "?").toUpperCase();

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/invest", label: "Lend" },
    { href: "/borrow", label: "Borrow" },
    { href: "/transactions", label: "Activity" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <header
        className="sticky top-0 z-40 border-b border-[var(--border)]"
        style={{
          background: "rgba(251,250,247,0.92)",
          backdropFilter: "saturate(180%) blur(12px)",
          WebkitBackdropFilter: "saturate(180%) blur(12px)",
        }}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between gap-4">
          <Link href="/dashboard" className="flex flex-col leading-none">
            <span className="font-bold text-[18px] text-[var(--ink)]">121.ai</span>
            <span className="text-[11px] font-medium text-[var(--ink-subtle)] hidden sm:inline">by LendLoop</span>
          </Link>
          <nav className="flex gap-1 text-sm overflow-x-auto">
            {navItems.map(n => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-2 rounded-[var(--radius-sm)] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--bg-alt)] transition"
              >
                {n.label}
              </Link>
            ))}
            {profile.role === "admin" && (
              <Link
                href="/admin"
                className="px-3 py-2 rounded-[var(--radius-sm)] font-medium text-[var(--accent)]"
              >
                Admin
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-[var(--ink-muted)]">{profile.first_name}</span>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white"
              style={{ background: "var(--brand)" }}
              aria-hidden="true"
            >
              {initial}
            </div>
            <form action={logoutAction}>
              <button className="px-3 h-9 rounded-[var(--radius-sm)] text-sm font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--bg-alt)]">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 sm:px-6 py-8 sm:py-10">{children}</main>

      <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row gap-3 sm:gap-6 items-center justify-between text-xs text-[var(--ink-muted)]">
          <div className="flex flex-wrap gap-4 items-center">
            <span className="inline-flex items-center gap-1.5">Stripe-secured</span>
            <span className="inline-flex items-center gap-1.5">GDPR compliant</span>
            <Link href="/terms" className="hover:text-[var(--ink)]">Terms</Link>
            <Link href="/privacy-policy" className="hover:text-[var(--ink)]">Privacy</Link>
            <Link href="/risk-warning" className="hover:text-[var(--ink)]">Risk warning</Link>
          </div>
          <div className="text-[11px] text-[var(--ink-subtle)] text-center sm:text-right">
            Capital is at risk. Not protected by deposit insurance. Demo platform.
          </div>
        </div>
      </footer>
    </div>
  );
}
