import { NextRequest, NextResponse } from "next/server";
import { processDueRepaymentsAction, applyLateFeesAndDefaultsAction } from "@/app/actions/repayment";

function authorise(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const expected = process.env.CRON_SECRET;
  return !!expected && token === expected;
}

export async function POST(req: NextRequest) {
  if (!authorise(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const repayments = await processDueRepaymentsAction();
  const lateAndDefault = await applyLateFeesAndDefaultsAction();
  return NextResponse.json({ repayments, lateAndDefault });
}

export const GET = POST;
