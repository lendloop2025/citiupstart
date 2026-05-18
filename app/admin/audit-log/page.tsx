import { createService } from "@/lib/db/client";
import { formatDate } from "@/lib/utils";

export default async function AuditLogPage() {
  const svc = createService();
  const { data: entries } = await svc.from("audit_log").select("*")
    .order("created_at", { ascending: false }).limit(200);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit log</h1>
      <div className="overflow-x-auto bg-[var(--card)] border border-[var(--border)] rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg)] text-left">
            <tr><th className="p-3">When</th><th className="p-3">Action</th><th className="p-3">Resource</th><th className="p-3">Actor IP</th></tr>
          </thead>
          <tbody>
            {entries?.map(e => (
              <tr key={e.id} className="border-t border-[var(--border)]">
                <td className="p-3 whitespace-nowrap">{formatDate(e.created_at)}</td>
                <td className="p-3 font-mono">{e.action_type}</td>
                <td className="p-3 font-mono text-xs">{e.resource_type}/{e.resource_id?.slice(0, 8) ?? "—"}</td>
                <td className="p-3 text-xs text-[var(--muted)]">{e.actor_ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
