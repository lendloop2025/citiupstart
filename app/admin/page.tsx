import Link from "next/link";
import { createService } from "@/lib/db/client";
import { formatEur } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const svc = createService();
  const [{ count: totalUsers }, { count: pendingKyc }, { count: activeLoans }, { data: ledgerSums }] = await Promise.all([
    svc.from("users").select("*", { count: "exact", head: true }),
    svc.from("users").select("*", { count: "exact", head: true }).in("status", ["pending_admin_approval", "pending_identity"]),
    svc.from("loans").select("*", { count: "exact", head: true }).in("status", ["active", "in_grace"]),
    svc.from("ledger").select("amount_cents").eq("entry_type", "platform_fee"),
  ]);

  const totalFees = ledgerSums?.reduce((s, l) => s + l.amount_cents, 0) ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Total users" value={String(totalUsers ?? 0)} />
        <Card label="Pending KYC" value={String(pendingKyc ?? 0)} cta={{ href: "/admin/pending-kyc", label: "Review →" }} />
        <Card label="Active loans" value={String(activeLoans ?? 0)} />
        <Card label="Platform fees collected" value={formatEur(totalFees)} />
      </div>
    </div>
  );
}

function Card({ label, value, cta }: { label: string; value: string; cta?: { href: string; label: string } }) {
  return (
    <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {cta && <Link href={cta.href} className="text-xs text-[var(--primary)] mt-1 inline-block">{cta.label}</Link>}
    </div>
  );
}
