"use client";
import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { startTotpSetupAction, confirmTotpAction } from "@/app/actions/onboarding";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold">{pending ? "Verifying..." : "Verify & continue"}</button>;
}

export default function TwoFactorPage() {
  const [setup, setSetup] = useState<{ qrDataUrl: string; backupCodes: string[] } | null>(null);
  const [state, action] = useActionState(confirmTotpAction, { error: "" } as any);

  useEffect(() => {
    startTotpSetupAction().then(setSetup);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Set up two-factor authentication</h1>
      <p className="text-sm text-[var(--muted)]">Use Google Authenticator, 1Password, or any TOTP app to scan this QR code.</p>

      {setup ? (
        <>
          <img src={setup.qrDataUrl} alt="2FA QR code" className="mx-auto w-48 h-48 bg-white p-2 rounded-lg" />
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Backup codes (save these now)</summary>
            <pre className="mt-2 p-3 bg-[var(--bg)] rounded-md text-xs grid grid-cols-2 gap-1">
              {setup.backupCodes.map(c => <span key={c}>{c}</span>)}
            </pre>
          </details>
          <form action={action} className="space-y-3 pt-2 border-t border-[var(--border)]">
            <div>
              <label className="text-sm">Enter the 6-digit code from your app</label>
              <input name="code" placeholder="123456" inputMode="numeric" maxLength={6} required />
            </div>
            {state?.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
            <SubmitBtn />
          </form>
        </>
      ) : (
        <p className="text-sm text-[var(--muted)] text-center">Generating QR…</p>
      )}
    </div>
  );
}
