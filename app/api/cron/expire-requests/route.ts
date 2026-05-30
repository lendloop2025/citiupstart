import { NextRequest, NextResponse } from "next/server";
import { createService } from "@/lib/db/client";
import { sendNotification } from "@/lib/notifications/send";
import { writeAuditLog } from "@/lib/audit/log";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const svc = createService();
  const today = new Date().toISOString();

  const { data: expired } = await svc.from("loan_requests")
    .select("id, borrower_id")
    .in("status", ["open", "partially_funded"])
    .lt("expires_at", today);

  if (!expired || expired.length === 0) {
    return NextResponse.json({ expired: 0 });
  }

  const ids = expired.map(r => r.id);

  await svc.from("loan_requests").update({ status: "expired" }).in("id", ids);

  await svc.from("loan_offers")
    .update({ status: "expired", decided_at: new Date().toISOString() })
    .in("request_id", ids).eq("status", "pending");

  for (const r of expired) {
    await sendNotification(r.borrower_id, "system_announcement", {
      title: "Loan request expired",
      body: "Your loan request expired without an accepted offer. You can post a new request whenever you're ready.",
      link_url: "/borrow",
    });
    await writeAuditLog({
      action_type: "loan.request.expired",
      resource_type: "loan_request", resource_id: r.id,
    });
  }

  return NextResponse.json({ expired: ids.length });
}

export const GET = POST;
