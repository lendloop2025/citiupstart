"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { saveAssessmentAction } from "@/app/actions/onboarding";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold">
      {pending ? "Calculating score..." : "Submit assessment"}
    </button>
  );
}

export default function AssessmentPage() {
  const router = useRouter();
  const [state, action] = useActionState(saveAssessmentAction, { error: "" } as any);

  useEffect(() => {
    if (state?.ok) router.push("/onboarding/complete");
  }, [state, router]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold mb-1">Borrower assessment</h1>
        <p className="text-sm text-[var(--muted)]">
          Tell us about your finances. This generates your initial credit score so the community knows what you can comfortably afford.
        </p>
      </div>

      <form action={action} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Monthly income (EUR)</label>
            <input name="monthly_income_eur" type="number" min={0} step={10} required defaultValue={1200} />
          </div>
          <div>
            <label className="text-sm">Monthly expenses (EUR)</label>
            <input name="monthly_expenses_eur" type="number" min={0} step={10} required defaultValue={800} />
          </div>
        </div>

        <div>
          <label className="text-sm">Existing debt (EUR)</label>
          <input name="existing_debt_eur" type="number" min={0} step={10} defaultValue={0} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Employment</label>
            <select name="employment_status" required defaultValue="part_time">
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="student_only">Student only</option>
            </select>
          </div>
          <div>
            <label className="text-sm">Employed (months)</label>
            <input name="employment_months" type="number" min={0} max={600} defaultValue={6} />
          </div>
        </div>

        <div>
          <label className="text-sm">NCI semesters completed</label>
          <input name="nci_semesters_completed" type="number" min={0} max={20} defaultValue={2} />
        </div>

        <label className="flex gap-2 items-center text-sm">
          <input name="has_emergency_fund" type="checkbox" className="w-4" />
          I have an emergency fund (at least one month of expenses saved)
        </label>

        <label className="flex gap-2 items-center text-sm">
          <input name="has_irp" type="checkbox" className="w-4" />
          I hold an IRP (Irish Residence Permit) or EU passport
        </label>

        {state?.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
        {state?.ok && (
          <p className="text-sm text-[var(--success)]">
            ✓ Assessment saved. Initial score: <strong>{state.score}/100</strong>
          </p>
        )}

        <SubmitBtn />
      </form>
    </div>
  );
}
