import Stripe from "stripe";
import { PLAN_PRICES } from "./pricing";

// Lazily initialised so a missing key only errors when a payment route is actually called,
// not at server startup (which would crash the whole dev server).
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || key.startsWith("sk_live_replace") || key.startsWith("sk_test_replace")) {
      throw new Error("STRIPE_SECRET_KEY is not configured. Add your key to .env.local");
    }
    _stripe = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  }
  return _stripe;
}

// Keep a named export for direct imports that already use `stripe`
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string, unknown>)[prop as string];
  },
});

// Plan → Stripe price — values come from src/lib/pricing.ts
export const STRIPE_PRICES: Record<"essential" | "pro", { amount: number; currency: string; label: string; description: string }> = {
  essential: { amount: PLAN_PRICES.essential.gbpAmount, currency: "gbp", label: PLAN_PRICES.essential.stripeLabel, description: PLAN_PRICES.essential.stripeDesc },
  pro:       { amount: PLAN_PRICES.pro.gbpAmount,       currency: "gbp", label: PLAN_PRICES.pro.stripeLabel,       description: PLAN_PRICES.pro.stripeDesc },
};
