import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

// App Router reads raw body via request.text() — no config needed (Pages Router legacy removed).
// force-dynamic ensures the route is never statically cached.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  console.log("📨 Stripe webhook received");
  const rawBody = await request.text();
  const sig     = request.headers.get("stripe-signature") ?? "";
  const secret  = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  if (!secret || secret === "whsec_replace_me") {
    console.error("❌ STRIPE_WEBHOOK_SECRET is not set in .env.local");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe webhook signature error:", message);
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId  = session.metadata?.user_id;
    const plan    = session.metadata?.plan as "essential" | "pro" | undefined;

    if (!userId || !plan) {
      console.error("Stripe webhook: missing metadata", session.metadata);
      return NextResponse.json({ received: true });
    }

    // Only upgrade on confirmed payment — not for free/pending sessions
    if (session.payment_status !== "paid") {
      console.warn(`Stripe webhook: skipping — payment_status=${session.payment_status}`);
      return NextResponse.json({ received: true });
    }

    const admin = createAdminClient();
    const pricePaid = session.amount_total ?? 0;
    const currency  = session.currency ?? "gbp";

    // 1. Update the user's plan
    const { error: planError } = await admin
      .from("profiles")
      .update({ plan })
      .eq("id", userId);

    if (planError) console.error("Stripe webhook: plan update error", planError);

    // 2. Record the purchase
    const { error: purchaseError } = await admin
      .from("purchases")
      .insert({
        user_id:          userId,
        plan,
        price_cents:      pricePaid,
        currency,
        payment_provider: "stripe",
        payment_id:       (typeof session.payment_intent === "string" ? session.payment_intent : null) ?? session.id,
        customer_email:   session.customer_email ?? session.metadata?.user_email ?? "",
        notes:            `Stripe session: ${session.id}`,
        activated_at:     new Date().toISOString(),
      });

    if (purchaseError) console.error("Stripe webhook: purchase insert error", purchaseError);

    console.log(`✅ Stripe payment confirmed: user=${userId} plan=${plan} amount=${pricePaid}${currency}`);
  }

  return NextResponse.json({ received: true });
}
