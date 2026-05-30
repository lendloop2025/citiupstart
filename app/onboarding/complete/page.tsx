import Link from "next/link";
import { requireUserProfile } from "@/lib/auth/session";

export default async function CompletePage() {
  const { profile } = await requireUserProfile();
  const verified = profile.status === "verified";

  return (
    <div className="text-center space-y-4">
      <h1 className="text-xl font-bold">{verified ? "You're all set!" : "Awaiting review"}</h1>
      <p className="text-sm text-[var(--muted)]">
        {verified
          ? "Your account is fully verified. Welcome to 121.ai."
          : "Your documents are with our admin team. You'll get an email when they're approved (usually within minutes during demo)."}
      </p>
      <Link href={verified ? "/dashboard" : "/login"} className="inline-block px-5 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold">
        {verified ? "Go to dashboard" : "Back to sign in"}
      </Link>
    </div>
  );
}
