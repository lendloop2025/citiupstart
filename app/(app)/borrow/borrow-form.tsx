"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight } from "lucide-react";
import { createLoanRequestAction } from "@/app/actions/borrow";

function SubmitBtn({ disabled }: Readonly<{ disabled: boolean }>) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending || disabled}
      className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-[var(--radius-sm)] bg-[var(--brand)] text-[var(--brand-fg)] font-semibold hover:bg-[var(--brand-hover)] transition disabled:opacity-50"
    >
      {pending ? "Posting..." : (<>Post loan request <ArrowRight size={16} /></>)}
    </button>
  );
}

export default function BorrowForm({
  maxAmountEur,
  eligible,
}: Readonly<{ maxAmountEur: number; eligible: boolean }>) {
  const [state, action] = useActionState(createLoanRequestAction, { error: "" } as any);

  if (!eligible) {
    return (
      <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-sm text-[var(--ink-muted)]">
        Your current credit score is below the minimum required to borrow on the platform. Verify your identity, complete your assessment, and build a positive history to unlock borrowing.
      </div>
    );
  }

  return (
    <form
      action={action}
      className="space-y-5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] p-6 sm:p-8"
    >
      <div>
        <label htmlFor="amount_eur">Amount (EUR, max €{maxAmountEur})</label>
        <input
          id="amount_eur"
          name="amount_eur"
          type="number"
          min={100}
          max={maxAmountEur}
          step={10}
          required
          defaultValue={Math.min(500, maxAmountEur)}
        />
      </div>
      <div>
        <label htmlFor="purpose">Purpose</label>
        <select id="purpose" name="purpose" required>
          <option value="emergency">Emergency</option>
          <option value="laptop_equipment">Laptop / equipment</option>
          <option value="tuition_topup">Tuition top-up</option>
          <option value="living_expenses">Living expenses</option>
          <option value="travel_home">Travel home</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label htmlFor="purpose_description">Description (optional)</label>
        <textarea
          id="purpose_description"
          name="purpose_description"
          maxLength={500}
          rows={3}
          placeholder="A few sentences for lenders…"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="term_months">Term (months)</label>
          <input id="term_months" name="term_months" type="number" min={1} max={12} required defaultValue={6} />
        </div>
        <div>
          <label htmlFor="max_apr_pct">Max APR you&apos;ll pay (%)</label>
          <input id="max_apr_pct" name="max_apr_pct" type="number" min={1} max={12} step={0.1} required defaultValue={10} />
        </div>
      </div>
      {state?.error && (
        <p className="text-sm text-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] rounded-[var(--radius-sm)] px-3 py-2">
          {state.error}
        </p>
      )}
      <SubmitBtn disabled={false} />
    </form>
  );
}
