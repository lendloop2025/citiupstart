import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Handshake,
  RotateCw,
  Lock,
  Shield,
  FileCheck,
  BadgeCheck,
  Check,
  TrendingUp,
  HandCoins,
} from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { LandingHeader } from "./_landing/landing-header";
import { FaqAccordion } from "./_landing/faq-accordion";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col bg-[var(--bg)]">
      <LandingHeader />

      {/* HERO */}
      <section
        className="relative overflow-hidden text-[var(--ink-dark-fg)]"
        style={{ background: "var(--ink-dark-bg)" }}
      >
        {/* radial highlight */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(900px 600px at 85% -10%, rgba(30,64,255,0.18), transparent 60%)",
          }}
        />
        {/* grid overlay */}
        <div aria-hidden className="absolute inset-0 bg-grid-dark opacity-60" />

        <div className="relative max-w-[1280px] mx-auto px-6 lg:px-10 pt-28 pb-24 lg:pt-36 lg:pb-32 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 slide-up">
            <div
              className="inline-flex items-center text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--brand-soft)] mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-[var(--brand-soft)] mr-2 inline-block" />
              For the NCI community
            </div>

            <h1 className="font-serif font-bold text-[44px] sm:text-[56px] lg:text-[72px] leading-[1.05]">
              <span className="block text-[var(--ink-dark-fg)]">Lend to your peers.</span>
              <span className="block text-[var(--brand-soft)]">Borrow from your community.</span>
            </h1>

            <p
              className="mt-7 max-w-[560px] text-[18px] leading-[1.6]"
              style={{ color: "rgba(251,250,247,0.7)" }}
            >
              Earn up to 12% APR by funding loans for verified NCI students, or get fairer rates than the bank from people who know you.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <LinkButton href="/register" variant="primary" size="xl" pill>
                Get started <ArrowRight size={18} />
              </LinkButton>
              <LinkButton href="/login" variant="inverted" size="xl" pill>
                Sign in
              </LinkButton>
            </div>

            <ul
              className="mt-9 flex flex-wrap gap-x-7 gap-y-2 text-[14px]"
              style={{ color: "rgba(251,250,247,0.6)" }}
            >
              <li className="inline-flex items-center gap-2"><Check size={16} className="text-[var(--brand-soft)]" /> Free to join</li>
              <li className="inline-flex items-center gap-2"><Check size={16} className="text-[var(--brand-soft)]" /> NCI students &amp; staff only</li>
              <li className="inline-flex items-center gap-2"><Check size={16} className="text-[var(--brand-soft)]" /> Capital at risk</li>
            </ul>
          </div>

          {/* Product mockup */}
          <div className="lg:col-span-5 slide-up">
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="bg-[var(--bg-alt)] border-y border-[var(--border)]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10 grid grid-cols-2 lg:grid-cols-4 gap-y-8 text-center">
          {[
            { n: "127", l: "members" },
            { n: "€48,200", l: "funded to date" },
            { n: "0", l: "defaults" },
            { n: "100%", l: "NCI verified" },
          ].map((s, i) => (
            <div
              key={s.l}
              className={`px-4 ${i > 0 ? "lg:border-l lg:border-[var(--border-strong)]" : ""}`}
            >
              <div className="text-[var(--text-h1)] sm:text-[40px] font-bold tabular text-[var(--ink)] leading-none">
                {s.n}
              </div>
              <div className="mt-2 text-sm text-[var(--ink-muted)]">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 lg:py-32">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-xs uppercase tracking-[0.12em] font-medium text-[var(--brand)] mb-3">
              How it works
            </div>
            <h2 className="font-serif text-[40px] sm:text-[56px] font-bold leading-[1.05]">
              How 121.ai works
            </h2>
            <p className="mt-5 text-[var(--ink-muted)] text-lg">
              Three steps from sign-up to your first loan, whether you&apos;re lending or borrowing.
            </p>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                n: "01",
                Icon: ShieldCheck,
                title: "Verify",
                body: "Sign up with your NCI email, verify ID, and get scored in minutes.",
              },
              {
                n: "02",
                Icon: Handshake,
                title: "Match",
                body: "Borrowers post their needs. Lenders make offers at fair APR. You choose.",
              },
              {
                n: "03",
                Icon: RotateCw,
                title: "Repay",
                body: "Loans are disbursed instantly. Repayments are scheduled and automated.",
              },
            ].map(({ n, Icon, title, body }) => (
              <div
                key={n}
                className="card-hover bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] p-8"
              >
                <div className="text-xs font-semibold tracking-[0.12em] text-[var(--accent)]">{n}</div>
                <div className="mt-6 w-12 h-12 rounded-[var(--radius-md)] bg-[var(--brand-soft)] flex items-center justify-center">
                  <Icon size={26} className="text-[var(--brand)]" />
                </div>
                <h3 className="mt-6 text-[var(--text-h3)] font-semibold">{title}</h3>
                <div className="mt-3 h-px bg-[var(--border)]" />
                <p className="mt-4 text-[var(--ink-muted)]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR BORROWERS */}
      <section id="for-borrowers" className="bg-[var(--bg-alt)] py-24 lg:py-32 border-y border-[var(--border)]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.12em] font-medium text-[var(--brand)] mb-3">
              For borrowers
            </div>
            <h2 className="font-serif text-[40px] sm:text-[48px] font-bold leading-[1.1]">
              Get a loan from people who get you.
            </h2>
            <p className="mt-5 text-[var(--ink-muted)] text-lg">
              Skip the bank&apos;s endless paperwork. Post a request, choose your terms, and let your peers fund what you need.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Borrow €100–€2,000 over 1–12 months",
                "Fixed APR — you set your ceiling",
                "No hidden fees, no late-payment shame games",
                "Up to 2 active loans depending on your score",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-[var(--brand-soft)] flex items-center justify-center shrink-0">
                    <Check size={12} className="text-[var(--brand)]" />
                  </span>
                  <span className="text-[var(--ink)]">{b}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 mt-10 text-[var(--brand)] font-semibold hover:gap-3 transition-all"
            >
              Learn more <ArrowRight size={16} />
            </Link>
          </div>
          <BorrowerMockup />
        </div>
      </section>

      {/* FOR LENDERS */}
      <section id="for-lenders" className="py-24 lg:py-32">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <LenderMockup />
          <div>
            <div className="text-xs uppercase tracking-[0.12em] font-medium text-[var(--brand)] mb-3">
              For lenders
            </div>
            <h2 className="font-serif text-[40px] sm:text-[48px] font-bold leading-[1.1]">
              Earn returns that beat your savings account.
            </h2>
            <p className="mt-5 text-[var(--ink-muted)] text-lg">
              Put idle cash to work in your community. Pick the requests that match your appetite and watch the interest roll in.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Up to 12% APR per loan",
                "Diversify across multiple loans",
                "Auto-Invest available for hands-off lending",
                "Every loan is digitally signed and audit-trailed",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-[var(--brand-soft)] flex items-center justify-center shrink-0">
                    <Check size={12} className="text-[var(--brand)]" />
                  </span>
                  <span className="text-[var(--ink)]">{b}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 mt-10 text-[var(--brand)] font-semibold hover:gap-3 transition-all"
            >
              Learn more <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* SCORE EXPLAINER */}
      <section className="bg-[var(--bg-alt)] py-24 lg:py-32 border-y border-[var(--border)]">
        <div className="max-w-[960px] mx-auto px-6 lg:px-10 text-center">
          <div className="text-xs uppercase tracking-[0.12em] font-medium text-[var(--brand)] mb-3">
            Score & limits
          </div>
          <h2 className="font-serif text-[40px] sm:text-[48px] font-bold leading-[1.1]">
            Your community score unlocks bigger loans.
          </h2>
          <p className="mt-5 text-[var(--ink-muted)] text-lg">
            We compute a 0–100 score from identity, income, stability, financial habits, and reputation.
          </p>

          <div className="mt-12">
            <ScoreGauge value={72} />
          </div>

          <div className="mt-12 bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] overflow-hidden text-left">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold text-[var(--ink-muted)]">Score</th>
                  <th className="text-left px-6 py-4 font-semibold text-[var(--ink-muted)]">Max loan</th>
                  <th className="text-left px-6 py-4 font-semibold text-[var(--ink-muted)]">Tier</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["0–29", "Not eligible", "High risk"],
                  ["30–49", "€200", "Elevated"],
                  ["50–64", "€500", "Moderate"],
                  ["65–79", "€1,000", "Standard"],
                  ["80–89", "€1,500", "Low"],
                  ["90–100", "€2,000", "Excellent"],
                ].map((row, i) => (
                  <tr key={row[0]} className={i > 0 ? "border-t border-[var(--border)]" : ""}>
                    <td className="px-6 py-4 tabular text-[var(--ink)] font-medium">{row[0]}</td>
                    <td className="px-6 py-4 tabular text-[var(--ink)]">{row[1]}</td>
                    <td className="px-6 py-4 text-[var(--ink-muted)]">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-sm text-[var(--ink-subtle)]">
            Score is recomputed after every repayment. Successful loans push your limit up.
          </p>
        </div>
      </section>

      {/* SECURITY */}
      <section id="security" className="border-y border-[var(--border)]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-16 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { Icon: Lock, title: "Stripe-powered", body: "All funds movement via licensed PSP" },
            { Icon: Shield, title: "GDPR compliant", body: "Data export and erasure on request" },
            { Icon: BadgeCheck, title: "NCI-only", body: "Closed community, real identities verified" },
            { Icon: FileCheck, title: "Fully audit-logged", body: "Every action recorded for transparency" },
          ].map(({ Icon, title, body }) => (
            <div key={title}>
              <Icon size={22} className="text-[var(--brand)]" />
              <div className="mt-3 font-semibold text-[var(--ink)]">{title}</div>
              <div className="text-sm text-[var(--ink-muted)] mt-1">{body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 lg:py-32">
        <div className="max-w-[760px] mx-auto px-6 lg:px-10">
          <div className="text-center">
            <div className="text-xs uppercase tracking-[0.12em] font-medium text-[var(--brand)] mb-3">
              FAQ
            </div>
            <h2 className="font-serif text-[40px] sm:text-[48px] font-bold leading-[1.1]">
              Common questions
            </h2>
          </div>

          <div className="mt-12">
            <FaqAccordion />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        className="relative overflow-hidden text-[var(--ink-dark-fg)]"
        style={{ background: "var(--ink-dark-bg)" }}
      >
        <div aria-hidden className="absolute inset-0 bg-grid-dark opacity-50" />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(700px 400px at 50% 100%, rgba(30,64,255,0.22), transparent 60%)",
          }}
        />
        <div className="relative max-w-[1280px] mx-auto px-6 lg:px-10 py-24 lg:py-28 text-center">
          <h2 className="font-serif text-[44px] sm:text-[56px] font-bold leading-[1.05]">
            Ready to lend or borrow?
          </h2>
          <p
            className="mt-4 text-lg max-w-[480px] mx-auto"
            style={{ color: "rgba(251,250,247,0.7)" }}
          >
            Join 127 NCI students using 121.ai today.
          </p>
          <div className="mt-9 flex flex-wrap gap-3 justify-center">
            <LinkButton href="/register" variant="primary" size="xl" pill>
              Get started <ArrowRight size={18} />
            </LinkButton>
            <LinkButton href="/login" variant="inverted" size="xl" pill>
              Sign in
            </LinkButton>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="text-[var(--ink-dark-fg)]"
        style={{ background: "var(--ink-dark-bg)", borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-16 grid md:grid-cols-3 gap-10">
          <div>
            <div className="font-bold text-xl">
              121.ai <span className="font-normal text-[var(--ink-subtle)] text-sm">by LendLoop</span>
            </div>
            <p className="mt-3 text-sm" style={{ color: "rgba(251,250,247,0.55)" }}>
              Peer-to-peer lending built for the NCI community.
            </p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.12em] text-[var(--ink-subtle)] mb-4">Product</div>
            <ul className="space-y-2 text-sm" style={{ color: "rgba(251,250,247,0.7)" }}>
              <li><Link href="/#how-it-works" className="hover:text-white">How it works</Link></li>
              <li><Link href="/#for-borrowers" className="hover:text-white">For borrowers</Link></li>
              <li><Link href="/#for-lenders" className="hover:text-white">For lenders</Link></li>
              <li><Link href="/#faq" className="hover:text-white">FAQ</Link></li>
              <li><Link href="/help" className="hover:text-white">Help</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.12em] text-[var(--ink-subtle)] mb-4">Legal</div>
            <ul className="space-y-2 text-sm" style={{ color: "rgba(251,250,247,0.7)" }}>
              <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-white">Privacy</Link></li>
              <li><Link href="/risk-warning" className="hover:text-white">Risk warning</Link></li>
              <li><Link href="/help" className="hover:text-white">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div
          className="border-t"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="max-w-[1280px] mx-auto px-6 lg:px-10 py-6 text-xs flex flex-col md:flex-row gap-3 md:items-center md:justify-between"
            style={{ color: "rgba(251,250,247,0.45)" }}
          >
            <span>© 2026 LendLoop. All rights reserved.</span>
            <span className="max-w-2xl md:text-right">
              121.ai is a peer-to-peer lending platform for NCI students and staff. Capital is at risk. Loans are not protected by deposit insurance. Past performance does not guarantee future returns.
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ---------- Visuals ---------- */

function HeroMockup() {
  return (
    <div
      className="relative mx-auto max-w-[480px] lg:ml-auto lg:mr-0"
      style={{ transform: "translateY(8px) rotate(-2deg)" }}
    >
      <div
        className="rounded-[var(--radius-lg)] overflow-hidden"
        style={{
          background: "var(--surface)",
          boxShadow:
            "0 40px 80px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.3)",
        }}
      >
        {/* fake browser bar */}
        <div className="flex items-center gap-1.5 px-4 py-3 bg-[#F1EFEA] border-b border-[var(--border)]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          <div className="flex-1 mx-3 h-5 rounded bg-[var(--surface)]" />
        </div>
        {/* dashboard preview */}
        <div className="p-5 space-y-4">
          <div
            className="rounded-[var(--radius-md)] p-5 text-white"
            style={{ background: "var(--ink-dark-bg)" }}
          >
            <div className="text-[10px] uppercase tracking-[0.14em] text-white/60">Total balance</div>
            <div className="mt-1 text-3xl font-bold tabular">€500.08</div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-[11px]">
              <div>
                <div className="text-white/60">Available</div>
                <div className="font-semibold tabular">€500.08</div>
              </div>
              <div>
                <div className="text-white/60">Lent</div>
                <div className="font-semibold tabular">€0.00</div>
              </div>
              <div>
                <div className="text-white/60">Earnings</div>
                <div className="font-semibold tabular">€0.00</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
              <div className="w-8 h-8 rounded-md bg-[var(--brand-soft)] flex items-center justify-center">
                <HandCoins size={16} className="text-[var(--brand)]" />
              </div>
              <div className="mt-3 text-sm font-semibold">Request a loan</div>
              <div className="text-[11px] text-[var(--ink-muted)] mt-0.5">€100–€2,000</div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
              <div className="w-8 h-8 rounded-md bg-[var(--brand-soft)] flex items-center justify-center">
                <TrendingUp size={16} className="text-[var(--brand)]" />
              </div>
              <div className="mt-3 text-sm font-semibold">Lend money</div>
              <div className="text-[11px] text-[var(--ink-muted)] mt-0.5">Up to 12% APR</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BorrowerMockup() {
  return (
    <div
      className="relative mx-auto max-w-[480px]"
      style={{ transform: "rotate(2deg)" }}
    >
      <div
        className="rounded-[var(--radius-lg)] overflow-hidden bg-[var(--surface)]"
        style={{ boxShadow: "0 30px 60px rgba(14,27,44,0.18)" }}
      >
        <div className="flex items-center gap-1.5 px-4 py-3 bg-[var(--bg-alt)] border-b border-[var(--border)]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-[var(--ink-muted)]">Request amount</div>
              <div className="text-3xl font-bold tabular">€800</div>
            </div>
            <div className="px-3 h-7 rounded-full bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)] text-xs font-semibold inline-flex items-center">
              Score 78
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-[var(--ink-muted)]">
              <span>Funded</span><span className="tabular">62%</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-[var(--bg-alt)] overflow-hidden">
              <div className="h-full bg-[var(--brand)]" style={{ width: "62%" }} />
            </div>
          </div>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between"><span className="text-[var(--ink-muted)]">Term</span><span className="tabular font-medium">8 months</span></li>
            <li className="flex justify-between"><span className="text-[var(--ink-muted)]">Max APR</span><span className="tabular font-medium">9.5%</span></li>
            <li className="flex justify-between"><span className="text-[var(--ink-muted)]">Purpose</span><span className="font-medium">Laptop &amp; equipment</span></li>
          </ul>
          <div className="h-9 rounded-[var(--radius-sm)] bg-[var(--brand)] text-white text-sm font-semibold flex items-center justify-center">
            Make an offer
          </div>
        </div>
      </div>
    </div>
  );
}

function LenderMockup() {
  return (
    <div
      className="relative mx-auto max-w-[480px]"
      style={{ transform: "rotate(-2deg)" }}
    >
      <div
        className="rounded-[var(--radius-lg)] overflow-hidden bg-[var(--surface)]"
        style={{ boxShadow: "0 30px 60px rgba(14,27,44,0.18)" }}
      >
        <div className="flex items-center gap-1.5 px-4 py-3 bg-[var(--bg-alt)] border-b border-[var(--border)]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        </div>
        <div className="p-6 space-y-4">
          <div className="text-xs uppercase tracking-[0.14em] text-[var(--ink-subtle)]">Open requests</div>
          {[
            { amt: "€500", term: "6 mo", apr: "8.0%", score: 84 },
            { amt: "€1,200", term: "10 mo", apr: "11.0%", score: 71 },
            { amt: "€300", term: "3 mo", apr: "7.5%", score: 90 },
          ].map((r) => (
            <div
              key={r.amt + r.term}
              className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--border)]"
            >
              <div>
                <div className="font-bold tabular">{r.amt}</div>
                <div className="text-xs text-[var(--ink-muted)]">{r.term} · max {r.apr}</div>
              </div>
              <div className="px-2.5 h-6 rounded-full text-xs font-semibold inline-flex items-center bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)] tabular">
                {r.score}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoreGauge({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const angle = (clamped / 100) * 180; // 0..180 degrees
  const radius = 110;
  const cx = 140;
  const cy = 140;
  // arc points
  const start = polar(cx, cy, radius, 180);
  const end = polar(cx, cy, radius, 180 + angle);
  const trackEnd = polar(cx, cy, radius, 360);
  const largeArc = angle > 180 ? 1 : 0;
  return (
    <div className="mx-auto" style={{ maxWidth: 300 }}>
      <svg viewBox="0 0 280 170" className="w-full h-auto">
        {/* track */}
        <path
          d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${trackEnd.x} ${trackEnd.y}`}
          stroke="var(--border)"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
        />
        {/* progress */}
        <path
          d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`}
          stroke="var(--brand)"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
        />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontWeight={700}
          fontSize="40"
          fill="var(--ink)"
        >
          {clamped}
        </text>
        <text
          x={cx}
          y={cy + 30}
          textAnchor="middle"
          fontSize="12"
          fill="var(--ink-subtle)"
        >
          Standard tier
        </text>
      </svg>
    </div>
  );
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
