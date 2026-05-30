import "server-only";
import { createService } from "@/lib/db/client";
import { computeScore, type ScoreOutput } from "@/lib/scoring/score";

export async function recomputeScore(userId: string): Promise<ScoreOutput | null> {
  const svc = createService();

  const { data: profile } = await svc.from("users")
    .select("id, community_id, status, identity_verified_at, totp_enabled, created_at")
    .eq("id", userId).single();
  if (!profile) return null;

  const { data: assessment } = await svc.from("borrower_assessments")
    .select("*").eq("user_id", userId)
    .order("submitted_at", { ascending: false }).limit(1).maybeSingle();
  if (!assessment) return null;

  const { data: docs } = await svc.from("documents")
    .select("kind, status").eq("user_id", userId);
  const hasStudentId = docs?.some(d => d.kind === "student_id" && d.status === "approved") ?? false;
  const incomeDoc = docs?.find(d => d.kind === "payslip" && d.status === "approved");

  const { data: loans } = await svc.from("loans")
    .select("id, status, paid_off_at").eq("borrower_id", userId);
  const totalCompleted = loans?.filter(l => l.status === "paid_off").length ?? 0;
  const totalActive = loans?.filter(l => ["active", "in_grace", "pending_signature", "pending_disbursement"].includes(l.status)).length ?? 0;
  const totalDefaulted = loans?.filter(l => ["in_default", "written_off"].includes(l.status)).length ?? 0;

  const loanIds = (loans ?? []).map(l => l.id);
  let onTime = 0, late = 0;
  if (loanIds.length > 0) {
    const { data: reps } = await svc.from("repayments")
      .select("status, days_late, paid_at, due_date").in("loan_id", loanIds);
    for (const r of reps ?? []) {
      if (r.status === "paid" && (r.days_late ?? 0) === 0) onTime++;
      else if (r.status === "late" || (r.days_late ?? 0) > 0) late++;
    }
  }

  const accountAgeDays = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000);

  const score = computeScore({
    identity_verified: !!profile.identity_verified_at,
    has_irp_or_eu_passport: assessment.has_irp ?? false,
    email_verified: true,
    has_2fa: !!profile.totp_enabled,
    has_student_id: hasStudentId,
    declared_monthly_income_cents: assessment.monthly_income_cents ?? 0,
    income_verified: !!incomeDoc,
    income_verification_age_days: 9999,
    employment_status: (assessment.employment_status as any) ?? "student_only",
    nci_semesters_completed: assessment.nci_semesters_completed ?? 0,
    account_age_days: accountAgeDays,
    has_emergency_fund: assessment.has_emergency_fund ?? false,
    declared_monthly_expenses_cents: assessment.monthly_expenses_cents ?? 0,
    existing_debt_cents: assessment.existing_debt_cents ?? 0,
    total_loans_completed: totalCompleted,
    total_loans_active: totalActive,
    on_time_payment_count: onTime,
    late_payment_count: late,
    defaulted_loan_count: totalDefaulted,
  });

  await svc.from("credit_scores").insert({
    user_id: userId,
    community_id: profile.community_id,
    total_score: score.total,
    identity_score: score.components.identity,
    income_score: score.components.income,
    stability_score: score.components.stability,
    financial_score: score.components.financial,
    reputation_score: score.components.reputation,
    breakdown: score.breakdown,
    algorithm_version: "v1.0",
  });

  return score;
}
