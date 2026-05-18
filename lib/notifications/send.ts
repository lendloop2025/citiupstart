import { createService } from "@/lib/db/client";
import { sendEmail } from "@/lib/email/client";
import * as React from "react";
import { GenericEmail } from "@/emails/generic";
import { OfferReceivedEmail } from "@/emails/offer-received";
import { LoanDisbursedEmail } from "@/emails/loan-disbursed";
import { RepaymentDueEmail } from "@/emails/repayment-due";
import { KycApprovedEmail } from "@/emails/kyc-approved";

type SendPayload = {
  title: string;
  body: string;
  link_url?: string;
  metadata?: Record<string, any>;
};

function buildTemplate(
  type: string,
  firstName: string,
  payload: SendPayload,
): React.ReactElement {
  const m = payload.metadata ?? {};
  switch (type) {
    case "offer_received":
      if (m.lenderName && m.amountEur && m.aprPct && m.requestId) {
        return React.createElement(OfferReceivedEmail, {
          firstName,
          lenderName: m.lenderName,
          amountEur: m.amountEur,
          aprPct: m.aprPct,
          requestId: m.requestId,
        });
      }
      break;
    case "loan_disbursed":
      if (m.amountEur && m.monthlyEur && m.loanId) {
        return React.createElement(LoanDisbursedEmail, {
          firstName,
          amountEur: m.amountEur,
          monthlyEur: m.monthlyEur,
          loanId: m.loanId,
        });
      }
      break;
    case "repayment_due_3d":
    case "repayment_due_today":
    case "repayment_late":
      if (m.amountEur && m.dueDate && m.loanId) {
        return React.createElement(RepaymentDueEmail, {
          firstName,
          amountEur: m.amountEur,
          dueDate: m.dueDate,
          loanId: m.loanId,
        });
      }
      break;
    case "kyc_approved":
      return React.createElement(KycApprovedEmail, { firstName });
  }
  return React.createElement(GenericEmail, {
    firstName,
    title: payload.title,
    body: payload.body,
    linkUrl: payload.link_url
      ? `${process.env.NEXT_PUBLIC_APP_URL}${payload.link_url}`
      : undefined,
  });
}

export async function sendNotification(
  userId: string,
  type: string,
  payload: SendPayload,
) {
  const svc = createService();
  const { data: profile } = await svc.from("users")
    .select("email,first_name,community_id").eq("id", userId).single();
  if (!profile) return;

  const { data: notif } = await svc.from("notifications").insert({
    user_id: userId,
    community_id: profile.community_id,
    type,
    title: payload.title,
    body: payload.body,
    link_url: payload.link_url,
    metadata: payload.metadata,
  }).select("id").single();

  try {
    const template = buildTemplate(type, profile.first_name || "there", payload);
    await sendEmail({
      to: profile.email,
      subject: payload.title,
      template,
    });
    if (notif?.id) {
      await svc.from("notifications")
        .update({ sent_via_email: true, email_sent_at: new Date().toISOString() })
        .eq("id", notif.id);
    }
  } catch (e) {
    console.error("Email send failed:", e);
  }
}
