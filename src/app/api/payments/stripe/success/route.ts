import { type NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPurchaseConfirmation, sendAdminPurchaseNotification } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * GET /api/payments/stripe/success?session_id=cs_xxx
 *
 * Stripe redirects here after checkout. We verify the session server-side,
 * write the plan to Supabase, then redirect the user to the dashboard.
 * This runs entirely on the server — no webhook or CLI listener needed.
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.redirect(`${APP_URL}/dashboard/premium?payment=error&reason=no_session`);
  }

  try {
    // 1. Get the logged-in user from their session cookie
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Not logged in — send to login then back
      return NextResponse.redirect(`${APP_URL}/login?next=/dashboard/premium`);
    }

    // 2. Retrieve the Stripe session and verify payment
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      console.warn(`Stripe success: payment not confirmed — status=${session.payment_status}`);
      return NextResponse.redirect(`${APP_URL}/dashboard/premium?payment=pending`);
    }

    const plan = session.metadata?.plan as "essential" | "pro" | undefined;
    const sessionUserId = session.metadata?.user_id;

    if (!plan) {
      console.error("Stripe success: no plan in session metadata", session.id);
      return NextResponse.redirect(`${APP_URL}/dashboard/premium?payment=error&reason=no_plan`);
    }

    if (sessionUserId && sessionUserId !== user.id) {
      console.error(`Stripe success: user mismatch — session=${sessionUserId} current=${user.id}`);
      return NextResponse.redirect(`${APP_URL}/dashboard/premium?payment=error&reason=user_mismatch`);
    }

    // 3. Update the plan in Supabase using the service-role key (bypasses RLS)
    const admin = createAdminClient();
    const { error: planError } = await admin
      .from("profiles")
      .update({ plan })
      .eq("id", user.id);

    if (planError) {
      console.error("Stripe success: failed to update plan", planError);
      return NextResponse.redirect(`${APP_URL}/dashboard/premium?payment=error&reason=db_error`);
    }

    // 4. Record the purchase (best-effort — don't fail if this errors)
    try {
      const paymentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.id;

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
    } catch (e) {
      console.warn("Stripe success: purchase record failed (non-fatal)", e);
    }

    console.log(`✅ Plan activated server-side: user=${user.id} plan=${plan}`);

    // 5. Send emails (best-effort — don't fail the redirect if email errors)
    const customerName = session.customer_details?.name ?? null;
    const customerEmail = session.customer_email ?? user.email ?? "";
    await Promise.allSettled([
      sendPurchaseConfirmation({
        to: customerEmail,
        name: customerName,
        plan,
        amount: session.amount_total ?? 0,
        currency: session.currency ?? "gbp",
      }),
      sendAdminPurchaseNotification({
        customerEmail,
        customerName,
        plan,
        amount: session.amount_total ?? 0,
        currency: session.currency ?? "gbp",
      }),
    ]);

    // 6. Redirect to dashboard — plan is already updated in Supabase
    return NextResponse.redirect(`${APP_URL}/dashboard/premium?payment=success&plan=${plan}`);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe success handler error:", message);
    return NextResponse.redirect(`${APP_URL}/dashboard/premium?payment=error&reason=exception`);
  }
}
