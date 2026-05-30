import { NextRequest, NextResponse } from "next/server";
import { createService } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/session";
import { renderAgreementPdfForLoan } from "@/lib/pdf/store";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const download = req.nextUrl.searchParams.get("download") === "1";
  const user = await requireUser();
  const svc = createService();

  const { data: loan } = await svc.from("loans")
    .select("borrower_id, lender_id, agreement_pdf_path, status").eq("id", id).single();
  if (!loan) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (loan.borrower_id !== user.id && loan.lender_id !== user.id) {
    const { data: profile } = await svc.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let pdf: Buffer | null = null;

  if (loan.agreement_pdf_path) {
    try {
      const { data, error } = await svc.storage.from("agreements").download(loan.agreement_pdf_path);
      if (error) {
        console.warn(`[agreement pdf] storage download failed for loan ${id}:`, error.message);
      } else if (data) {
        pdf = Buffer.from(await data.arrayBuffer());
      }
    } catch (e) {
      console.warn(`[agreement pdf] storage exception for loan ${id}:`, e);
    }
  }

  if (!pdf) {
    try {
      pdf = await renderAgreementPdfForLoan(id);
    } catch (e) {
      console.error(`[agreement pdf] render failed for loan ${id}:`, e);
      return NextResponse.json(
        { error: "render_failed", detail: e instanceof Error ? e.message : String(e) },
        { status: 500 },
      );
    }
  }
  if (!pdf) return NextResponse.json({ error: "render_failed" }, { status: 500 });

  return new NextResponse(pdf as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="loan-agreement-${id.slice(0, 8)}.pdf"`,
    },
  });
}
