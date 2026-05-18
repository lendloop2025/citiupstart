import { createService } from "@/lib/db/client";
import { approveKycAction, rejectKycAction } from "@/app/actions/admin";
import { formatDate } from "@/lib/utils";

export default async function PendingKycPage() {
  const svc = createService();
  const { data: pending } = await svc.from("users")
    .select("id, email, first_name, last_name, status, created_at")
    .in("status", ["pending_admin_approval", "pending_identity"])
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pending KYC reviews</h1>
      {pending?.length ? (
        <div className="space-y-3">
          {pending.map(u => (
            <div key={u.id} className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{u.first_name ?? "—"} {u.last_name ?? ""}</div>
                <div className="text-xs text-[var(--muted)]">{u.email}</div>
                <div className="text-xs text-[var(--muted)]">Submitted {formatDate(u.created_at)} · Status: {u.status.replace(/_/g, " ")}</div>
              </div>
              <div className="flex gap-2">
                <form action={approveKycAction}>
                  <input type="hidden" name="user_id" value={u.id} />
                  <button className="px-3 py-1.5 rounded-md bg-[var(--success)] text-white text-sm font-semibold">Approve</button>
                </form>
                <form action={rejectKycAction} className="flex gap-1">
                  <input type="hidden" name="user_id" value={u.id} />
                  <input name="reason" placeholder="Reason..." className="!w-32 !py-1 !text-xs" />
                  <button className="px-3 py-1.5 rounded-md bg-[var(--error)] text-white text-sm font-semibold">Reject</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-[var(--muted)]">Nothing pending.</p>}
    </div>
  );
}
