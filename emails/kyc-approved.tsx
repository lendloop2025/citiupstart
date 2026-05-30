import * as React from "react";
import { GenericEmail } from "./generic";

export function KycApprovedEmail({ firstName }: { firstName: string }) {
  return (
    <GenericEmail
      firstName={firstName}
      title="Your account is verified ✓"
      body="Your identity has been confirmed and your 121.ai account is now fully verified.\n\nYou can now deposit funds, browse loan requests, and either lend to or borrow from fellow NCI students."
      linkUrl="/dashboard"
    />
  );
}
