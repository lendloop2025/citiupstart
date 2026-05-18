import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createService } from "@/lib/db/client";

export async function GET() {
  const user = await requireUser();
  const svc = createService();

  const [profile, wallet, ledger, loans, scores, consents] = await Promise.all([
    svc.from("users").select("*").eq("id", user.id).single(),
    svc.from("wallets").select("*").eq("user_id", user.id).single(),
    svc.from("ledger").select("*").eq("user_id", user.id),
    svc.from("loans").select("*").or(`borrower_id.eq.${user.id},lender_id.eq.${user.id}`),
    svc.from("credit_scores").select("*").eq("user_id", user.id),
    svc.from("consent_records").select("*").eq("user_id", user.id),
  ]);

  return new NextResponse(
    JSON.stringify({
      profile: profile.data,
      wallet: wallet.data,
      ledger: ledger.data,
      loans: loans.data,
      scores: scores.data,
      consents: consents.data,
      exported_at: new Date().toISOString(),
    }, null, 2),
    {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="my-data-${user.id}.json"`,
      },
    }
  );
}
