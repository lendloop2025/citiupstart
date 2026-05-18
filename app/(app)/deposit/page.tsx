"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useEffect } from "react";
import { createDepositSessionAction } from "@/app/actions/wallet";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold">{pending ? "Redirecting..." : "Continue to payment"}</button>;
}

export default function DepositPage() {
  const [state, action] = useActionState(createDepositSessionAction, { url: "", error: "" } as any);

  useEffect(() => {
    if (state?.url) window.location.href = state.url;
  }, [state]);

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Deposit funds</h1>
      <p className="text-sm text-[var(--muted)]">
        Demo mode: payments are processed via Stripe test mode. Use card <code>4242 4242 4242 4242</code>, any future expiry, any CVC.
      </p>
      <form action={action} className="space-y-3">
        <div>
          <label className="text-sm">Amount (EUR)</label>
          <input name="amount_eur" type="number" min={10} max={2000} step={0.01} defaultValue={100} required />
        </div>
        {state?.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
        <SubmitBtn />
      </form>
    </div>
  );
}
