"use server";
import { z } from "zod";
import Stripe from "stripe";
import { requireVerified } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/log";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-11-20.acacia" as any });

const DepositSchema = z.object({
  amount_eur: z.coerce.number().min(10).max(2000),
});

export async function createDepositSessionAction(_prev: any, formData: FormData) {
  const { user } = await requireVerified();
  const parsed = DepositSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Amount must be between €10 and €2000." };

  const amountCents = Math.round(parsed.data.amount_eur * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "eur",
        product_data: { name: "121.ai wallet top-up" },
        unit_amount: amountCents,
      },
    }],
    metadata: { user_id: user.id, purpose: "wallet_deposit" },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?deposit=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/deposit?cancelled=1`,
  });

  await writeAuditLog({
    actor_user_id: user.id, action_type: "wallet.deposit.initiated",
    metadata: { amount_cents: amountCents, session_id: session.id },
  });

  return { url: session.url };
}
