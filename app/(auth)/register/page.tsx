"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { registerAction } from "@/app/actions/auth";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-[var(--radius-sm)] bg-[var(--brand)] text-[var(--brand-fg)] font-semibold hover:bg-[var(--brand-hover)] transition disabled:opacity-50"
    >
      {pending ? "Creating account..." : (<>Create account <ArrowRight size={16} /></>)}
    </button>
  );
}

export default function RegisterPage() {
  const [state, action] = useActionState(registerAction, { error: "" } as any);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl sm:text-[40px] font-bold tracking-tight leading-[1.1]">
          Create your account
        </h1>
        <p className="text-[var(--ink-muted)] mt-2">
          Open to current NCI students and staff only.
        </p>
      </div>

      <form action={action} className="space-y-5">
        <div>
          <label htmlFor="email">NCI email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="x12345678@student.ncirl.ie"
          />
        </div>
        <div>
          <label htmlFor="password">Password (min 10 characters)</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
          />
        </div>

        <fieldset className="space-y-3 pt-2">
          <legend className="sr-only">Consents</legend>
          {[
            {
              name: "consent_terms",
              label: (
                <>
                  I agree to the{" "}
                  <Link href="/terms" className="font-medium text-[var(--brand)] hover:underline">
                    Terms of Service
                  </Link>
                  .
                </>
              ),
            },
            {
              name: "consent_privacy",
              label: (
                <>
                  I agree to the{" "}
                  <Link href="/privacy-policy" className="font-medium text-[var(--brand)] hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </>
              ),
            },
            {
              name: "consent_risk",
              label: (
                <>
                  I understand that <strong>capital is at risk</strong> and not protected by deposit insurance.
                </>
              ),
            },
          ].map((c) => (
            <label key={c.name} className="!mb-0 flex gap-3 items-start text-[var(--ink)] font-normal cursor-pointer">
              <input
                type="checkbox"
                name={c.name}
                required
                className="mt-1 w-[18px] h-[18px] shrink-0 accent-[var(--brand)]"
              />
              <span className="text-sm leading-[1.5] flex-1">{c.label}</span>
            </label>
          ))}
        </fieldset>

        {state?.error && (
          <p className="text-sm text-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] rounded-[var(--radius-sm)] px-3 py-2">
            {state.error}
          </p>
        )}

        <SubmitBtn />
      </form>

      <p className="text-sm text-[var(--ink-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[var(--brand)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
