import * as React from "react";
import { GenericEmail } from "./generic";

export function RepaymentDueEmail({ firstName, amountEur, dueDate, loanId }: {
  firstName: string; amountEur: string; dueDate: string; loanId: string;
}) {
  return (
    <GenericEmail
      firstName={firstName}
      title={`Repayment of €${amountEur} due on ${dueDate}`}
      body={`Your next loan repayment of €${amountEur} is due on ${dueDate}.\n\nMake sure your wallet has sufficient balance. Repayments are taken automatically.`}
      linkUrl={`/loans/${loanId}`}
    />
  );
}
