import { Resend } from "resend";
import { render } from "@react-email/render";
import * as React from "react";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendEmail(opts: {
  to: string;
  subject: string;
  template: React.ReactElement;
}) {
  const html = await render(opts.template);
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    to: opts.to,
    subject: opts.subject,
    html,
  });
}
