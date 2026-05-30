"use server";
import { revalidatePath } from "next/cache";
import { createService } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/log";
import { sendNotification } from "@/lib/notifications/send";
import { recomputeScore } from "@/lib/scoring/recompute";
import { processDueRepaymentsAction, applyLateFeesAndDefaultsAction } from "@/app/actions/repayment";

export async function approveKycAction(formData: FormData) {
  const { user: admin } = await requireAdmin();
  const userId = String(formData.get("user_id") || "");
  if (!userId) throw new Error("Missing user.");

  const svc = createService();
  const { data: target } = await svc.from("users").select("first_name, status").eq("id", userId).single();
  if (!target) throw new Error("User not found.");

  await svc.from("users").update({
    status: "verified",
    identity_verified_at: new Date().toISOString(),
    identity_verification_method: "manual_admin",
  }).eq("id", userId);

  await svc.from("documents").update({
    status: "approved",
    reviewed_by: admin.id,
    reviewed_at: new Date().toISOString(),
  }).eq("user_id", userId).in("status", ["uploaded", "under_review"]);

  await svc.from("aml_screenings").insert({
    user_id: userId, provider: "simulated", result: "clear",
    pep_match: false, sanctions_match: false, adverse_media_match: false,
  });

  await recomputeScore(userId);

  await sendNotification(userId, "kyc_approved", {
    title: "Account verified",
    body: "Your identity has been confirmed. You can now access full platform features.",
    link_url: "/dashboard",
  });

  await writeAuditLog({
    actor_user_id: admin.id, action_type: "admin.kyc.approved",
    resource_type: "user", resource_id: userId,
  });

  revalidatePath("/admin/pending-kyc");
}

export async function rejectKycAction(formData: FormData) {
  const { user: admin } = await requireAdmin();
  const userId = String(formData.get("user_id") || "");
  const reason = String(formData.get("reason") || "Documents not acceptable.");
  if (!userId) throw new Error("Missing user.");

  const svc = createService();
  await svc.from("documents").update({
    status: "rejected", rejection_reason: reason,
    reviewed_by: admin.id, reviewed_at: new Date().toISOString(),
  }).eq("user_id", userId).in("status", ["uploaded", "under_review"]);

  await svc.from("users").update({ status: "pending_identity" }).eq("id", userId);

  await sendNotification(userId, "kyc_rejected", {
    title: "Identity verification needs attention",
    body: `Your documents could not be approved. Reason: ${reason}\n\nPlease re-upload clearer copies.`,
    link_url: "/onboarding/identity",
  });

  await writeAuditLog({
    actor_user_id: admin.id, action_type: "admin.kyc.rejected",
    resource_type: "user", resource_id: userId, metadata: { reason },
  });

  revalidatePath("/admin/pending-kyc");
}

export async function timeWarpLoanAction(formData: FormData) {
  await requireAdmin();
  const loanId = String(formData.get("loan_id") || "");
  const months = Number(formData.get("months") || 1);
  if (!loanId) throw new Error("Missing loan.");

  const svc = createService();
  await svc.rpc("time_warp_loan", { p_loan_id: loanId, p_months: months });

  // App-level processor handles wallet transfers, score recompute, and notifications
  // (the SQL RPC is kept for diagnostic use only).
  await processDueRepaymentsAction();
  await applyLateFeesAndDefaultsAction();

  await writeAuditLog({
    action_type: "admin.demo.time_warp",
    resource_type: "loan", resource_id: loanId,
    metadata: { months_advanced: months },
  });

  revalidatePath(`/admin/loans/${loanId}`);
}

export async function runAutoInvestAction() {
  await requireAdmin();
  const svc = createService();
  const { data } = await svc.rpc("auto_invest_run");
  return { ok: true, offers_created: data };
}
