"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveAutoInvestStrategyAction } from "@/app/actions/lend";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold">{pending ? "Saving..." : "Save strategy"}</button>;
}

export default function AutoInvestPage() {
  const [state, action] = useActionState(saveAutoInvestStrategyAction, { error: "" } as any);

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Auto-Invest strategy</h1>
      <p className="text-sm text-[var(--muted)]">When a new loan request matches your criteria, an offer will be submitted automatically using your wallet balance.</p>

      <form action={action} className="space-y-3 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        <div>
          <label className="text-sm">Strategy name</label>
          <input name="name" required defaultValue="Conservative NCI" />
        </div>
        <div>
          <label className="text-sm">Minimum borrower score</label>
          <input name="min_score" type="number" min={0} max={100} required defaultValue={65} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-sm">Min APR (%)</label><input name="min_apr_pct" type="number" min={0} max={12} step={0.1} required defaultValue={6} /></div>
          <div><label className="text-sm">Max APR (%)</label><input name="max_apr_pct" type="number" min={0} max={12} step={0.1} required defaultValue={10} /></div>
        </div>
        <div>
          <label className="text-sm">Max term (months)</label>
          <input name="max_term_months" type="number" min={1} max={12} required defaultValue={6} />
        </div>
        <div>
          <label className="text-sm">Investment per loan (EUR)</label>
          <input name="investment_per_loan_eur" type="number" min={10} max={2000} required defaultValue={50} />
        </div>
        {state?.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
        {state?.ok && <p className="text-sm text-[var(--success)]">✓ Strategy saved.</p>}
        <SubmitBtn />
      </form>
    </div>
  );
}
