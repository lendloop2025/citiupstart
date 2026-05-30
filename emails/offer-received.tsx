import * as React from "react";
import { GenericEmail } from "./generic";

export function OfferReceivedEmail({ firstName, lenderName, amountEur, aprPct, requestId }: {
  firstName: string; lenderName: string; amountEur: string; aprPct: string; requestId: string;
}) {
  return (
    <GenericEmail
      firstName={firstName}
      title="You have a new loan offer"
      body={`${lenderName} has offered to fund €${amountEur} of your request at ${aprPct}% APR.\n\nReview the offer and decide whether to accept it.`}
      linkUrl={`/borrow/${requestId}`}
    />
  );
}
