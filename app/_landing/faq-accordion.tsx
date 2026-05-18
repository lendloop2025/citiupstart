"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Who can join 121.ai?",
    a: "Current students and staff at the National College of Ireland with a valid @student.ncirl.ie or @ncirl.ie email. We verify identity at sign-up and keep the community closed.",
  },
  {
    q: "How is the score calculated?",
    a: "Five factors: identity strength, declared income, account stability, financial habits, and on-platform reputation. The score is recomputed after every repayment.",
  },
  {
    q: "What happens if a borrower defaults?",
    a: "We escalate via reminders, restructure where possible, and report defaults to the community score. Capital is at risk — losses are not insured. We publish default rates monthly.",
  },
  {
    q: "Is my money protected?",
    a: "Funds in the platform wallet are held with our licensed payment provider. However peer-to-peer loans are not protected by deposit insurance. Capital is always at risk.",
  },
  {
    q: "Can I withdraw at any time?",
    a: "Available wallet balance can be withdrawn at any time. Money already lent is locked into the loan agreement and is repaid on its agreed schedule.",
  },
  {
    q: "What fees does 121.ai charge?",
    a: "We don’t charge listing or sign-up fees. Standard payment processing fees apply on deposits and withdrawals. Lending and borrowing inside the platform is free.",
  },
  {
    q: "Is 121.ai regulated?",
    a: "121.ai is a closed-community platform operating under the LendLoop entity. We are not yet authorised by the Central Bank of Ireland. The platform is offered for the NCI community on a best-effort basis.",
  },
  {
    q: "What can I borrow money for?",
    a: "Tuition top-ups, laptop and equipment, emergencies, living expenses, travel home, or anything else legal. Purpose is shared with potential lenders so they can decide.",
  },
];

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-6 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-[var(--ink)]">{f.q}</span>
              <ChevronDown
                size={20}
                className="shrink-0 text-[var(--ink-subtle)] transition-transform"
                style={{ transform: isOpen ? "rotate(180deg)" : undefined }}
              />
            </button>
            <div
              className="overflow-hidden transition-all duration-200"
              style={{
                maxHeight: isOpen ? 280 : 0,
                opacity: isOpen ? 1 : 0,
              }}
            >
              <p className="pb-5 text-[var(--ink-muted)] leading-relaxed">{f.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
