import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { getLivePrices } from "@/lib/settings";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const plan = body.plan as "essential" | "pro";
  if (!plan || !["essential", "pro"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const prices = await getLivePrices();
  const price  = prices[plan];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // "card" enables Apple Pay & Google Pay automatically in Stripe Checkout.
      payment_method_types: ["card"],
      // Allows customers to apply promo/discount codes at checkout.
      // Create codes in: Stripe Dashboard → Products → Coupons → Promotion codes
      allow_promotion_codes: true,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: price.gbpPence,
            product_data: {
              name: `GTransfer — ${plan === "pro" ? "Pro" : "Essential"} Plan`,
              description: plan === "pro"
                ? "Unlimited transfers + Mega.nz & Drime (40 GB extra storage)"
                : "Unlimited Gmail & Drive transfers between Google accounts",
            },
          },
        },
      ],
      metadata: {
        user_id:  user.id,
        user_email: user.email ?? "",
        plan,
      },
      customer_email: user.email ?? undefined,
      success_url: `${appUrl}/api/payments/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/dashboard/premium?payment=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe checkout error:", message);
    return NextResponse.json({ error: "Failed to create checkout session", detail: message }, { status: 500 });
  }
}
