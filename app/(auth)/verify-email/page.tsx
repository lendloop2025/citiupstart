import Link from "next/link";
import { redirect } from "next/navigation";
import { createServer, createService } from "@/lib/db/client";

// Map a user_status value to the next onboarding screen they should land on.
function nextStepFor(status: string | null | undefined): string {
  switch (status) {
    case "verified":
      return "/dashboard";
    case "pending_personal_details":
      return "/onboarding/personal-details";
    case "pending_2fa":
      return "/onboarding/two-factor";
    case "pending_identity":
      return "/onboarding/identity";
    case "pending_address_proof":
      return "/onboarding/identity";
    case "pending_admin_approval":
      return "/onboarding/complete";
    default:
      return "/onboarding/personal-details";
  }
}

export default async function VerifyEmailPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ sent?: string }> }>) {
  const sp = await searchParams;
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  // Already signed in? Skip the dead-end and go to whatever step the account is at.
  if (user) {
    const svc = createService();
    const { data: profile } = await svc.from("users").select("status").eq("id", user.id).single();
    if (profile?.status && profile.status !== "pending_email_verification") {
      redirect(nextStepFor(profile.status));
    }
  }

  return (
    <div className="text-center space-y-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold">Check your inbox</h1>
      {sp.sent && (
        <p className="text-sm text-[var(--ink-muted)]">
          We sent a verification link to your NCI email. Click it to continue setup.
        </p>
      )}
      <p className="text-xs text-[var(--ink-muted)]">
        For demo accounts pre-seeded by an admin, this step is skipped.
      </p>

      <div className="flex flex-col gap-2 pt-4">
        {user ? (
          <Link
            href="/onboarding/personal-details"
            className="block w-full text-center px-4 py-3 rounded-lg bg-[var(--brand)] text-[var(--brand-fg)] font-semibold"
          >
            Continue setup →
          </Link>
        ) : (
          <Link
            href="/login"
            className="block w-full text-center px-4 py-3 rounded-lg bg-[var(--brand)] text-[var(--brand-fg)] font-semibold"
          >
            Continue to sign in →
          </Link>
        )}
        <Link
          href="/"
          className="block w-full text-center px-4 py-3 rounded-lg border border-[var(--border-strong)] font-semibold hover:border-[var(--brand)]"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
