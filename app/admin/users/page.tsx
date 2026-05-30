import { createService } from "@/lib/db/client";
import { formatDate } from "@/lib/utils";

export default async function AdminUsersPage() {
  const svc = createService();
  const { data: users } = await svc.from("users")
    .select("id, email, first_name, last_name, role, status, created_at")
    .order("created_at", { ascending: false }).limit(100);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      <div className="overflow-x-auto bg-[var(--card)] border border-[var(--border)] rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg)] text-left">
            <tr><th className="p-3">Email</th><th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Joined</th></tr>
          </thead>
          <tbody>
            {users?.map(u => (
              <tr key={u.id} className="border-t border-[var(--border)]">
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.first_name ?? "—"} {u.last_name ?? ""}</td>
                <td className="p-3 capitalize">{u.role}</td>
                <td className="p-3 capitalize">{u.status.replace(/_/g, " ")}</td>
                <td className="p-3">{formatDate(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
