"use client";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { counterOfferAction } from "@/app/actions/borrow";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-3 py-1.5 rounded-md bg-[var(--brand)] text-[var(--brand-fg)] text-sm font-semibold disabled:opacity-50"
    >
      {pending ? "Sending…" : "Send counter"}
    </button>
  );
}

export default function CounterOfferForm({
  offerId,
  defaultAmountEur,
  defaultAprPct,
  defaultTermMonths,
  maxAmountEur,
  maxAprPct,
}: {
  offerId: string;
  defaultAmountEur: number;
  defaultAprPct: number;
  defaultTermMonths: number;
  maxAmountEur: number;
  maxAprPct: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(counterOfferAction, { error: "" } as any);

  // Re-fetch the parent server component when the counter is accepted so the
  // original offer flips to "Superseded by your counter" and Accept disappears.
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-md border border-[var(--border-strong)] text-sm font-semibold hover:border-[var(--brand)]"
      >
        Counter offer
      </button>
    );
  }

  if (state?.ok) {
    return (
      <span className="text-sm text-[var(--success)] font-semibold">
        Counter sent — waiting on lender
      </span>
    );
  }

  return (
    <form action={action} className="space-y-2 mt-3 p-3 bg-[var(--bg-alt)] rounded-md w-full">
      <input type="hidden" name="offer_id" value={offerId} />
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs">
          <span className="text-[var(--ink-muted)]">Amount (€)</span>
          <input
            name="amount_eur" type="number" step="1" min="10" max={maxAmountEur}
            defaultValue={defaultAmountEur}
            className="w-full mt-1 px-2 py-1.5 border border-[var(--border-strong)] rounded text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="text-[var(--ink-muted)]">APR (%)</span>
          <input
            name="apr_pct" type="number" step="0.1" min="1" max={maxAprPct}
            defaultValue={defaultAprPct}
            className="w-full mt-1 px-2 py-1.5 border border-[var(--border-strong)] rounded text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="text-[var(--ink-muted)]">Term (mo)</span>
          <input
            name="term_months" type="number" step="1" min="1" max="12"
            defaultValue={defaultTermMonths}
            className="w-full mt-1 px-2 py-1.5 border border-[var(--border-strong)] rounded text-sm"
          />
        </label>
      </div>
      <textarea
        name="message"
        placeholder="Optional note to the lender"
        maxLength={500}
        className="w-full px-2 py-1.5 border border-[var(--border-strong)] rounded text-sm"
        rows={2}
      />
      {state?.error && <p className="text-xs text-[var(--danger)]">{state.error}</p>}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 rounded-md text-sm text-[var(--ink-muted)]"
        >
          Cancel
        </button>
        <Submit />
      </div>
    </form>
  );
}
