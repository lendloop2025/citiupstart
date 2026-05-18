import * as React from "react";
import { GenericEmail } from "./generic";

export function VerifyEmail({ firstName, code }: { firstName: string; code: string }) {
  return (
    <GenericEmail
      firstName={firstName}
      title="Verify your NCI email"
      body={`Your verification code is:\n\n${code}\n\nThis code expires in 15 minutes. If you didn't request this, ignore this email.`}
    />
  );
}
