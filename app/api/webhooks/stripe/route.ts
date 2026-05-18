import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createService } from "@/lib/db/client";
import { creditWallet } from "@/lib/finance/wallet";
import { sendNotification } from "@/lib/notifications/send";
import { formatEur } from "@/lib/utils";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-11-20.acacia" as any });

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 });
  }

  const svc = createService();

  // Idempotency: skip if we've seen this event id
  const { data: existing } = await svc.from("webhooks_inbound").select("id").eq("event_id", event.id).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, skipped: "duplicate" });

  await svc.from("webhooks_inbound").insert({
    provider: "stripe", event_id: event.id, event_type: event.type,
    payload: event as any, signature_valid: true, processed: false,
  });

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const purpose = session.metadata?.purpose;
      const amount = session.amount_total ?? 0;

      if (userId && purpose === "wallet_deposit" && amount > 0) {
        await creditWallet({
          userId, amountCents: amount,
          entryType: "deposit_cleared",
          relatedStripeId: session.id,
          description: "Stripe deposit",
        });
        await sendNotification(userId, "deposit_received", {
          title: "Deposit received",
          body: `${formatEur(amount)} has been credited to your wallet.`,
          link_url: "/dashboard",
        });
      }
    }

    await svc.from("webhooks_inbound").update({
      processed: true, processed_at: new Date().toISOString(),
    }).eq("event_id", event.id);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    await svc.from("webhooks_inbound").update({
      processed: false, processing_error: err.message,
    }).eq("event_id", event.id);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
