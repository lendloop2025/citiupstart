"use client";
import { useState } from "react";
import { uploadIdentityAction } from "@/app/actions/onboarding";

export default function IdentityPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    const res = await uploadIdentityAction(fd);
    if (res?.error) { setError(res.error); setLoading(false); }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-xl font-bold">Upload identity documents</h1>
      <p className="text-sm text-[var(--muted)]">An admin will review within minutes. For demo accounts this is pre-approved.</p>

      <div>
        <label className="text-sm">Document type</label>
        <select name="doc_type" required defaultValue="passport">
          <option value="passport">Passport</option>
          <option value="irp_card">IRP card</option>
          <option value="national_id">National ID</option>
          <option value="driving_licence">Driving licence</option>
        </select>
      </div>

      <div>
        <label className="text-sm">Document — front</label>
        <input name="identity_front" type="file" accept="image/*,.pdf" required />
      </div>
      <div>
        <label className="text-sm">Document — back (optional for passports)</label>
        <input name="identity_back" type="file" accept="image/*,.pdf" />
      </div>
      <div>
        <label className="text-sm">Selfie (face clearly visible)</label>
        <input name="selfie" type="file" accept="image/*" required />
      </div>

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}
      <button disabled={loading} className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold">
        {loading ? "Uploading…" : "Submit for review"}
      </button>
    </form>
  );
}
