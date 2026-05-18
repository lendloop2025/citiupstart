import { headers } from "next/headers";
import { createService } from "@/lib/db/client";

export async function writeAuditLog(input: {
  actor_user_id?: string;
  action_type: string;
  resource_type?: string;
  resource_id?: string;
  before_state?: any;
  after_state?: any;
  metadata?: any;
}) {
  const svc = createService();
  const h = await headers();
  await svc.from("audit_log").insert({
    ...input,
    actor_ip: h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? null,
    actor_user_agent: h.get("user-agent") ?? null,
  });
}
