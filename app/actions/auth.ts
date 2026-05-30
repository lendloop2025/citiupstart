"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createServer, createService } from "@/lib/db/client";
import { isNciEmail } from "@/lib/auth/domain-allowlist";
import { writeAuditLog } from "@/lib/audit/log";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(72),
  consent_terms: z.literal("on"),
  consent_privacy: z.literal("on"),
  consent_risk: z.literal("on"),
});

export async function registerAction(_prev: any, formData: FormData) {
  const parsed = RegisterSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    consent_terms: formData.get("consent_terms"),
    consent_privacy: formData.get("consent_privacy"),
    consent_risk: formData.get("consent_risk"),
  });
  if (!parsed.success) return { error: "Please complete all fields and consents." };

  const { email, password } = parsed.data;
  if (!isNciEmail(email)) {
    return { error: "Registration is currently limited to NCI students and staff (@student.ncirl.ie or @ncirl.ie)." };
  }

  const supabase = await createServer();
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/personal-details` },
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: "Registration failed." };

  const svc = createService();
  const { data: community } = await svc.from("communities").select("id").eq("slug", "nci").single();

  await svc.from("users").insert({
    id: data.user.id,
    email,
    community_id: community!.id,
    status: "pending_email_verification",
  });

  await svc.from("consent_records").insert([
    { user_id: data.user.id, consent_type: "terms", version: "v1.0", granted: true },
    { user_id: data.user.id, consent_type: "privacy", version: "v1.0", granted: true },
    { user_id: data.user.id, consent_type: "risk_warning", version: "v1.0", granted: true },
  ]);

  await writeAuditLog({
    actor_user_id: data.user.id,
    action_type: "user.register",
    resource_type: "user", resource_id: data.user.id,
  });

  redirect("/verify-email?sent=1");
}

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginAction(_prev: any, formData: FormData) {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Invalid credentials." };

  const supabase = await createServer();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  return { ok: true };
}

export async function logoutAction() {
  const supabase = await createServer();
  await supabase.auth.signOut();
  redirect("/login");
}
