"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createServer, createService } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/session";
import { setupTotp, verifyTotp, encryptSecret, decryptSecret } from "@/lib/auth/totp";
import { writeAuditLog } from "@/lib/audit/log";
import { computeScore } from "@/lib/scoring/score";
import { sendNotification } from "@/lib/notifications/send";
import bcrypt from "bcryptjs";

const PersonalSchema = z.object({
  first_name: z.string().min(1).max(60),
  last_name: z.string().min(1).max(60),
  date_of_birth: z.string(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  mobile_e164: z.string().regex(/^\+?[1-9]\d{7,14}$/),
  address_line1: z.string().min(1).max(120),
  address_line2: z.string().max(120).optional(),
  city: z.string().min(1).max(80),
  postal_code: z.string().min(1).max(20),
  country: z.string().length(2),
  nci_program: z.string().min(1),
  nci_year: z.coerce.number().int().min(1).max(8),
});

export async function savePersonalAction(_prev: any, formData: FormData) {
  const user = await requireUser();
  const parsed = PersonalSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Please fill in all required fields correctly." };

  const dob = new Date(parsed.data.date_of_birth);
  const age18 = new Date(); age18.setFullYear(age18.getFullYear() - 18);
  if (dob > age18) return { error: "You must be at least 18 years old." };

  const svc = createService();
  await svc.from("users").update({
    ...parsed.data,
    status: "pending_2fa",
  }).eq("id", user.id);

  await writeAuditLog({
    actor_user_id: user.id,
    action_type: "onboarding.personal_details",
    resource_type: "user", resource_id: user.id,
  });

  redirect("/onboarding/two-factor");
}

export async function startTotpSetupAction() {
  const user = await requireUser();
  const setup = await setupTotp(user.email!);

  const svc = createService();
  const codeHashes = await Promise.all(setup.backupCodes.map(c => bcrypt.hash(c, 10)));

  await svc.from("users").update({
    totp_secret_encrypted: encryptSecret(setup.secret),
    backup_codes_hashed: codeHashes,
  }).eq("id", user.id);

  return { qrDataUrl: setup.qrDataUrl, backupCodes: setup.backupCodes };
}

export async function confirmTotpAction(_prev: any, formData: FormData) {
  const user = await requireUser();
  const code = String(formData.get("code") || "").trim();
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code." };

  const svc = createService();
  const { data: u } = await svc.from("users").select("totp_secret_encrypted").eq("id", user.id).single();
  if (!u?.totp_secret_encrypted) return { error: "2FA not initialised." };

  const secret = decryptSecret(u.totp_secret_encrypted);
  if (!verifyTotp(code, secret)) return { error: "Code is incorrect." };

  await svc.from("users").update({
    totp_enabled: true, status: "pending_identity",
  }).eq("id", user.id);

  await writeAuditLog({ actor_user_id: user.id, action_type: "auth.2fa.enabled" });

  redirect("/onboarding/identity");
}

export async function uploadIdentityAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createServer();
  const svc = createService();

  const front = formData.get("identity_front") as File | null;
  const back = formData.get("identity_back") as File | null;
  const selfie = formData.get("selfie") as File | null;
  const docType = String(formData.get("doc_type") || "passport");

  if (!front || !selfie) return { error: "Identity front + selfie are required." };

  const { data: profile } = await svc.from("users").select("community_id").eq("id", user.id).single();
  if (!profile) return { error: "User profile not found." };

  async function upload(file: File, kind: string) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("documents")
      .upload(path, file, { contentType: file.type });
    if (upErr) throw new Error(upErr.message);
    await svc.from("documents").insert({
      user_id: user.id, community_id: profile!.community_id,
      kind, status: "under_review", storage_path: path,
      original_filename: file.name, mime_type: file.type, file_size_bytes: file.size,
    });
  }

  try {
    await upload(front, "identity_front");
    if (back) await upload(back, "identity_back");
    await upload(selfie, "selfie");
  } catch (e: any) {
    return { error: "Upload failed: " + e.message };
  }

  await svc.from("users").update({
    identity_doc_type: docType,
    status: "pending_admin_approval",
  }).eq("id", user.id);

  await writeAuditLog({ actor_user_id: user.id, action_type: "kyc.documents_uploaded" });

  redirect("/onboarding/assessment");
}

const AssessmentSchema = z.object({
  monthly_income_eur: z.coerce.number().min(0).max(10000),
  monthly_expenses_eur: z.coerce.number().min(0).max(10000),
  existing_debt_eur: z.coerce.number().min(0).max(50000).default(0),
  employment_status: z.enum(["full_time", "part_time", "student_only"]),
  employment_months: z.coerce.number().int().min(0).max(600),
  has_emergency_fund: z.coerce.boolean(),
  has_irp: z.coerce.boolean(),
  nci_semesters_completed: z.coerce.number().int().min(0).max(20),
});

export async function saveAssessmentAction(_prev: any, formData: FormData) {
  const user = await requireUser();
  const raw = Object.fromEntries(formData.entries());
  const parsed = AssessmentSchema.safeParse({
    ...raw,
    has_emergency_fund: raw.has_emergency_fund === "on",
    has_irp: raw.has_irp === "on",
  });
  if (!parsed.success) return { error: "Please fill in all fields." };

  const svc = createService();
  const { data: profile } = await svc.from("users").select("community_id, identity_verified_at, totp_enabled, created_at").eq("id", user.id).single();

  await svc.from("borrower_assessments").insert({
    user_id: user.id, community_id: profile!.community_id,
    monthly_income_cents: Math.round(parsed.data.monthly_income_eur * 100),
    monthly_expenses_cents: Math.round(parsed.data.monthly_expenses_eur * 100),
    existing_debt_cents: Math.round(parsed.data.existing_debt_eur * 100),
    employment_status: parsed.data.employment_status,
    employment_months: parsed.data.employment_months,
    has_emergency_fund: parsed.data.has_emergency_fund,
    has_irp: parsed.data.has_irp,
    nci_semesters_completed: parsed.data.nci_semesters_completed,
  });

  // Compute initial score
  const accountAgeDays = Math.floor((Date.now() - new Date(profile!.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const score = computeScore({
    identity_verified: !!profile!.identity_verified_at,
    has_irp_or_eu_passport: parsed.data.has_irp,
    email_verified: true, has_2fa: !!profile!.totp_enabled,
    has_student_id: false,
    declared_monthly_income_cents: Math.round(parsed.data.monthly_income_eur * 100),
    income_verified: false, income_verification_age_days: 9999,
    employment_status: parsed.data.employment_status,
    nci_semesters_completed: parsed.data.nci_semesters_completed,
    account_age_days: accountAgeDays,
    has_emergency_fund: parsed.data.has_emergency_fund,
    declared_monthly_expenses_cents: Math.round(parsed.data.monthly_expenses_eur * 100),
    existing_debt_cents: Math.round(parsed.data.existing_debt_eur * 100),
    total_loans_completed: 0, total_loans_active: 0,
    on_time_payment_count: 0, late_payment_count: 0, defaulted_loan_count: 0,
  });

  await svc.from("credit_scores").insert({
    user_id: user.id, community_id: profile!.community_id,
    total_score: score.total,
    identity_score: score.components.identity,
    income_score: score.components.income,
    stability_score: score.components.stability,
    financial_score: score.components.financial,
    reputation_score: score.components.reputation,
    breakdown: score.breakdown,
    algorithm_version: "v1.0",
  });

  await writeAuditLog({ actor_user_id: user.id, action_type: "borrower.assessment_submitted" });

  return { ok: true, score: score.total };
}
