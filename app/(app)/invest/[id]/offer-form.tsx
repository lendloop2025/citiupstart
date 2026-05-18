"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createOfferAction } from "@/app/actions/lend";
import { Button } from "@/components/ui/button";

function SubmitBtn({ submitted }: Readonly<{ submitted: boolean }>) {
  const { pending } = useFormStatus();
  let label = "Submit offer";
  if (submitted) label = "Offer submitted";
  else if (pending) label = "Submitting...";
  return (
    <Button type="submit" disabled={pending || submitted} fullWidth size="lg">
      {label}
    </Button>
  );
}

export default function OfferForm({ requestId, maxApr, maxAmount, defaultTerm, walletEur }: Readonly<{
  requestId: string; maxApr: number; maxAmount: number; defaultTerm: number; walletEur: number;
}>) {
  const [state, action] = useActionState(createOfferAction, { ok: false, error: "" } as any);
  const [amount, setAmount] = useState(Math.min(500, Math.floor(maxAmount)));
  const [apr, setApr] = useState(Math.min(8, maxApr));
  const [term, setTerm] = useState(defaultTerm);

  const monthlyRate = (apr / 100) / 12;
  const monthly = monthlyRate === 0
    ? amount / term
    : (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -term));
  const totalReturn = monthly * term - amount;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="request_id" value={requestId} />

      <div>
        <label htmlFor="amount_eur">
          Amount you'll lend <span className="text-[var(--fg-subtle)] font-normal">· wallet €{walletEur.toFixed(2)}</span>
        </label>
        <input
          id="amount_eur" name="amount_eur" type="number"
          min={10} max={maxAmount} step={1} required
          value={amount}
          onChange={e => setAmount(Number(e.target.value))}
        />
      </div>

      <div>
        <label htmlFor="apr_pct">Your APR <span className="text-[var(--fg-subtle)] font-normal">· max {maxApr.toFixed(2)}%</span></label>
        <input
          id="apr_pct" name="apr_pct" type="number"
          min={1} max={maxApr} step={0.1} required
          value={apr}
          onChange={e => setApr(Number(e.target.value))}
        />
      </div>

      <div>
        <label htmlFor="term_months">Term <span className="text-[var(--fg-subtle)] font-normal">· max {defaultTerm} months</span></label>
        <input
          id="term_months" name="term_months" type="number"
          min={1} max={defaultTerm} required
          value={term}
          onChange={e => setTerm(Number(e.target.value))}
        />
      </div>

      <div>
        <label htmlFor="message">Message to borrower <span className="text-[var(--fg-subtle)] font-normal">· optional</span></label>
        <textarea id="message" name="message" maxLength={500} rows={3} placeholder="Best of luck with your studies!" />
      </div>

      <div className="rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] p-3 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--fg-muted)]">Monthly repayment</span>
          <span className="font-semibold tabular">€{monthly.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--fg-muted)]">Total return</span>
          <span className="font-semibold tabular text-[var(--primary)]">€{totalReturn.toFixed(2)}</span>
        </div>
      </div>

      {state?.error && <p className="text-sm text-[var(--danger)]">{state.error}</p>}
      {state?.ok && (
        <p className="text-sm text-[var(--primary)]">
          ✓ Offer submitted. The borrower has been notified. Reload the page to send a different offer.
        </p>
      )}

      <SubmitBtn submitted={!!state?.ok} />
    </form>
  );
}
