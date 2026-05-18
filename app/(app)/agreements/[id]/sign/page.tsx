"use client";
import { use, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signAgreementAction } from "@/app/actions/agreement";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-full py-3 rounded-lg bg-[var(--brand)] text-[var(--brand-fg)] font-bold disabled:opacity-50"
    >
      {pending ? "Signing..." : "I agree — sign electronically"}
    </button>
  );
}

export default function SignPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = use(params);
  const [state, action] = useActionState(signAgreementAction, { error: "" } as any);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Loan agreement</h1>
        <a
          href={`/api/agreements/${id}/pdf?download=1`}
          download={`loan-agreement-${id.slice(0, 8)}.pdf`}
          className="text-sm px-4 py-2 rounded-md bg-[var(--surface)] border border-[var(--border-strong)] font-semibold hover:border-[var(--brand)]"
        >
          Download PDF
        </a>
      </div>
      <p className="text-sm text-[var(--ink-muted)]">
        This agreement was drafted by Claude (Anthropic) for your specific loan terms. Both the borrower and the
        lender must sign electronically before funds are disbursed. You can download the PDF at any time — both
        before signing (draft) and after signing (signed copy with timestamps and IP audit).
      </p>
      <iframe
        title="Loan agreement preview"
        src={`/api/agreements/${id}/pdf?preview=1`}
        className="w-full h-[65vh] border border-[var(--border)] rounded-xl bg-white"
      />

      <form action={action} className="space-y-3 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
        <input type="hidden" name="loan_id" value={id} />
        <label className="flex gap-2 items-start text-sm">
          <input type="checkbox" required className="mt-1 w-4" />
          <span>
            I have read the agreement above and consent to signing it electronically. I understand this constitutes
            a legally binding contract under Irish law (Electronic Commerce Act 2000 / eIDAS).
          </span>
        </label>
        {state?.error && <p className="text-sm text-[var(--danger)]">{state.error}</p>}
        <SubmitBtn />
      </form>
    </div>
  );
}
