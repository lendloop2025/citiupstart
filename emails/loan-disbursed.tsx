import * as React from "react";
import { GenericEmail } from "./generic";

export function LoanDisbursedEmail({ firstName, amountEur, monthlyEur, loanId }: {
  firstName: string; amountEur: string; monthlyEur: string; loanId: string;
}) {
  return (
    <GenericEmail
      firstName={firstName}
      title={`Your loan is funded — €${amountEur} disbursed`}
      body={`Your loan agreement is signed and €${amountEur} has been credited to your wallet.\n\nFirst repayment of €${monthlyEur} is due in 30 days. You can pay early at any time without penalty.`}
      linkUrl={`/loans/${loanId}`}
    />
  );
}
