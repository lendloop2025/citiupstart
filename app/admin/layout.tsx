import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { logoutAction } from "@/app/actions/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--warning)] bg-[var(--card)]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="font-bold text-lg text-[var(--primary)]">121.ai</Link>
            <span className="text-xs px-2 py-1 rounded-full bg-[var(--warning)] text-white font-bold">ADMIN</span>
          </div>
          <nav className="flex gap-1 text-sm">
            <Link href="/admin" className="px-3 py-1.5 rounded-md hover:bg-[var(--bg)]">Overview</Link>
            <Link href="/admin/pending-kyc" className="px-3 py-1.5 rounded-md hover:bg-[var(--bg)]">Pending KYC</Link>
            <Link href="/admin/users" className="px-3 py-1.5 rounded-md hover:bg-[var(--bg)]">Users</Link>
            <Link href="/admin/loans" className="px-3 py-1.5 rounded-md hover:bg-[var(--bg)]">Loans</Link>
            <Link href="/admin/audit-log" className="px-3 py-1.5 rounded-md hover:bg-[var(--bg)]">Audit log</Link>
          </nav>
          <form action={logoutAction}>
            <button className="px-3 py-1.5 rounded-md border border-[var(--border)] text-sm">Sign out</button>
          </form>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">{children}</main>
    </div>
  );
}
