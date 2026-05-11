import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/payments/stripe/verify
 * Called by the success page to confirm payment and activate the plan immediately.
 * Verifies the Stripe session server-side — no webhook / CLI listener required.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await request.json() as { sessionId?: string };
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Validate the session belongs to this user
    if (session.metadata?.user_id !== user.id) {
      return NextResponse.json({ error: "Session does not belong to this user" }, { status: 403 });
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed", payment_status: session.payment_status }, { status: 402 });
    }

    const plan = session.metadata?.plan as "essential" | "pro" | undefined;
    if (!plan) return NextResponse.json({ error: "No plan in session metadata" }, { status: 400 });

    const admin = createAdminClient();

    // 1. Update the plan
    const { error: planError } = await admin
      .from("profiles")
      .update({ plan })
      .eq("id", user.id);

    if (planError) {
      console.error("verify-session: plan update failed", planError);
      return NextResponse.json({ error: planError.message }, { status: 500 });
    }

    // 2. Record purchase — skip if already recorded for this session
    const paymentId = typeof session.payment_intent === "string" ? session.payment_intent : session.id;
    const { data: existing } = await admin
      .from("purchases")
      .select("id")
      .eq("payment_id", paymentId)
      .maybeSingle();

    if (!existing) {
      await admin.from("purchases").insert({
        user_id:          user.id,
        plan,
        price_cents:      session.amount_total ?? 0,
        currency:         session.currency ?? "gbp",
        payment_provider: "stripe",
        payment_id:       paymentId,
        customer_email:   session.customer_email ?? user.email ?? "",
        notes:            `Stripe session: ${session.id}`,
        activated_at:     new Date().toISOString(),
      });
    }

    console.log(`✅ Plan verified & activated: user=${user.id} plan=${plan}`);
    return NextResponse.json({ ok: true, plan });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("verify-session error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
