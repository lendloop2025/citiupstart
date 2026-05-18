"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { savePersonalAction } from "@/app/actions/onboarding";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold">{pending ? "Saving..." : "Save & continue"}</button>;
}

export default function PersonalDetailsPage() {
  const [state, action] = useActionState(savePersonalAction, { error: "" } as any);
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-xl font-bold">Tell us about yourself</h1>

      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-sm">First name</label><input name="first_name" required /></div>
        <div><label className="text-sm">Last name</label><input name="last_name" required /></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-sm">Date of birth</label><input name="date_of_birth" type="date" required /></div>
        <div>
          <label className="text-sm">Gender</label>
          <select name="gender" required>
            <option value="prefer_not_to_say">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div><label className="text-sm">Mobile (with country code)</label><input name="mobile_e164" placeholder="+353871234567" required /></div>

      <div><label className="text-sm">Address line 1</label><input name="address_line1" required /></div>
      <div><label className="text-sm">Address line 2 (optional)</label><input name="address_line2" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-sm">City</label><input name="city" required defaultValue="Dublin" /></div>
        <div><label className="text-sm">Postal code</label><input name="postal_code" required /></div>
      </div>
      <div><label className="text-sm">Country</label><input name="country" required defaultValue="IE" maxLength={2} /></div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
        <div><label className="text-sm">NCI program</label><input name="nci_program" required placeholder="MSc Cloud Computing" /></div>
        <div><label className="text-sm">NCI year</label><input name="nci_year" type="number" min={1} max={8} required defaultValue={1} /></div>
      </div>

      {state?.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
      <SubmitBtn />
    </form>
  );
}
