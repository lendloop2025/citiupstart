import Link from "next/link";
import { createService } from "@/lib/db/client";
import { formatEur, formatDate } from "@/lib/utils";

export default async function AdminLoansPage() {
  const svc = createService();
  const { data: loans } = await svc.from("loans")
    .select("id, principal_cents, apr_bps, term_months, status, created_at")
    .order("created_at", { ascending: false }).limit(100);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Loans</h1>
      <div className="overflow-x-auto bg-[var(--card)] border border-[var(--border)] rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg)] text-left">
            <tr><th className="p-3">ID</th><th className="p-3">Principal</th><th className="p-3">Term</th><th className="p-3">APR</th><th className="p-3">Status</th><th className="p-3">Created</th></tr>
          </thead>
          <tbody>
            {loans?.map(l => (
              <tr key={l.id} className="border-t border-[var(--border)]">
                <td className="p-3 font-mono"><Link href={`/admin/loans/${l.id}`} className="text-[var(--primary)]">{l.id.slice(0, 8)}...</Link></td>
                <td className="p-3">{formatEur(l.principal_cents)}</td>
                <td className="p-3">{l.term_months}mo</td>
                <td className="p-3">{(l.apr_bps / 100).toFixed(2)}%</td>
                <td className="p-3 capitalize">{l.status.replace(/_/g, " ")}</td>
                <td className="p-3">{formatDate(l.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
