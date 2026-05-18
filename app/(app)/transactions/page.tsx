import { requireVerified } from "@/lib/auth/session";
import { createService } from "@/lib/db/client";
import { formatEur, formatDate } from "@/lib/utils";

export default async function TransactionsPage() {
  const { user } = await requireVerified();
  const svc = createService();
  const { data: ledger } = await svc.from("ledger").select("*").eq("user_id", user.id)
    .order("created_at", { ascending: false }).limit(100);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Transactions</h1>
      <div className="overflow-x-auto bg-[var(--card)] border border-[var(--border)] rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg)] text-left">
            <tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Description</th><th className="p-3 text-right">Amount</th><th className="p-3 text-right">Balance</th></tr>
          </thead>
          <tbody>
            {ledger?.map(l => (
              <tr key={l.id} className="border-t border-[var(--border)]">
                <td className="p-3 whitespace-nowrap">{formatDate(l.created_at)}</td>
                <td className="p-3 capitalize">{l.entry_type.replace(/_/g, " ")}</td>
                <td className="p-3">{l.description ?? "—"}</td>
                <td className={`p-3 text-right font-mono ${l.amount_cents >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                  {l.amount_cents >= 0 ? "+" : ""}{formatEur(l.amount_cents)}
                </td>
                <td className="p-3 text-right font-mono">{formatEur(l.balance_after_cents)}</td>
              </tr>
            ))}
            {(!ledger || ledger.length === 0) && (
              <tr><td colSpan={5} className="p-6 text-center text-[var(--muted)]">No transactions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
