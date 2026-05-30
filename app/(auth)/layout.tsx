import Link from "next/link";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-[var(--bg)]">
      {/* Form column */}
      <div className="lg:col-span-7 flex flex-col">
        <div className="px-6 lg:px-12 pt-8">
          <Link href="/" className="inline-flex flex-col leading-none">
            <span className="font-bold text-[18px] text-[var(--ink)]">121.ai</span>
            <span className="text-[11px] font-medium text-[var(--ink-subtle)]">by LendLoop</span>
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 lg:px-12 py-10">
          <div className="w-full max-w-[440px]">{children}</div>
        </div>
        <div className="px-6 lg:px-12 pb-8 text-xs text-[var(--ink-subtle)]">
          Capital is at risk. Demo platform — not yet authorised by the Central Bank of Ireland.
        </div>
      </div>

      {/* Brand panel */}
      <aside
        className="hidden lg:flex lg:col-span-5 relative overflow-hidden"
        style={{ background: "var(--ink-dark-bg)" }}
      >
        <div aria-hidden className="absolute inset-0 bg-grid-dark opacity-50" />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(700px 500px at 80% 0%, rgba(30,64,255,0.25), transparent 60%)",
          }}
        />
        <div className="relative flex flex-col justify-between p-12 text-[var(--ink-dark-fg)]">
          <div className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--brand-soft)" }}>
            For the NCI community
          </div>
          <div>
            <h2 className="font-serif font-bold text-[44px] leading-[1.05]">
              Lend to your peers.
              <br />
              <span style={{ color: "var(--brand-soft)" }}>Borrow from your community.</span>
            </h2>
            <p className="mt-6 text-[16px] leading-relaxed" style={{ color: "rgba(251,250,247,0.7)" }}>
              Earn up to 12% APR by funding loans for verified NCI students, or get fairer rates than the bank from people who know you.
            </p>
            <div
              className="mt-10 grid grid-cols-3 gap-4 pt-6 border-t"
              style={{ borderColor: "rgba(255,255,255,0.10)" }}
            >
              {[
                { n: "127", l: "members" },
                { n: "€48,200", l: "funded" },
                { n: "0", l: "defaults" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-[24px] font-bold tabular leading-none">{s.n}</div>
                  <div
                    className="mt-1 text-[12px]"
                    style={{ color: "rgba(251,250,247,0.6)" }}
                  >
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-[12px]" style={{ color: "rgba(251,250,247,0.45)" }}>
            © 2026 LendLoop
          </div>
        </div>
      </aside>
    </div>
  );
}
