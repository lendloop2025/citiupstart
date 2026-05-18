"use client";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { loginAction } from "@/app/actions/auth";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-[var(--radius-sm)] bg-[var(--brand)] text-[var(--brand-fg)] font-semibold hover:bg-[var(--brand-hover)] transition disabled:opacity-50"
    >
      {pending ? "Signing in..." : (<>Sign in <ArrowRight size={16} /></>)}
    </button>
  );
}

export default function LoginPage() {
  const [state, action] = useActionState(loginAction, { error: "" } as any);

  useEffect(() => {
    if (state?.ok) {
      window.location.href = "/dashboard";
    }
  }, [state]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl sm:text-[40px] font-bold tracking-tight leading-[1.1]">Welcome back</h1>
        <p className="text-[var(--ink-muted)] mt-2">Sign in to your 121.ai account.</p>
      </div>

      <form action={action} className="space-y-5">
        <div>
          <label htmlFor="email">NCI email</label>
          <input id="email" name="email" type="email" autoComplete="email" required placeholder="x12345678@student.ncirl.ie" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="!mb-0" htmlFor="password">Password</label>
            <Link href="/forgot-password" className="text-sm font-medium text-[var(--brand)] hover:underline">
              Forgot password?
            </Link>
          </div>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>

        {state?.error && (
          <p className="text-sm text-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] rounded-[var(--radius-sm)] px-3 py-2">
            {state.error}
          </p>
        )}

        <SubmitBtn />
      </form>

      <p className="text-sm text-[var(--ink-muted)]">
        New to 121.ai?{" "}
        <Link href="/register" className="font-semibold text-[var(--brand)] hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
