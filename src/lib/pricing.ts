// ═══════════════════════════════════════════════════════════════════
//  📝  PRICING CONFIG — edit this file to change prices everywhere
//  All other files import from here; nothing else needs updating.
// ═══════════════════════════════════════════════════════════════════

export const PLAN_PRICES = {
  essential: {
    /** Amount in pence (GBP × 100). Change £19 → update gbpAmount to new pence value */
    gbpAmount:   1900,
    gbpDisplay:  "£19",
    /** Indian Rupees — shown only to customers with an Indian IP address */
    inrAmount:   1999,
    inrDisplay:  "₹1,999",
    stripeLabel: "Essential Plan",
    stripeDesc:  "Unlimited Gmail & Drive transfers between Google accounts",
  },
  pro: {
    gbpAmount:   3900,
    gbpDisplay:  "£39",
    inrAmount:   3999,
    inrDisplay:  "₹3,999",
    stripeLabel: "Pro Plan",
    stripeDesc:  "Everything in Essential + priority support",
  },
} as const;

// ─── Promo / discount banner ──────────────────────────────────────────────────
//
//  HOW TO USE:
//  1. In Stripe Dashboard → Products → Coupons → "+ New coupon"
//     e.g. name "LAUNCH20", 20% off, applies to all products
//  2. On the coupon detail page → "Promotion codes" → "+ Add code"
//     Set the code to exactly match the `code` field below
//  3. Set `enabled: true` here — the banner shows automatically
//  4. To end the promotion, set `enabled: false` again
//
// ─────────────────────────────────────────────────────────────────────────────
export const PROMO_BANNER = {
  /** Flip to true to show the banner on the pricing page */
  enabled:     false,

  /** The Stripe promotion code customers enter at checkout (case-insensitive) */
  code:        "LAUNCH20",

  /** Text shown before the code box, e.g. "Launch discount — use code" */
  message:     "Launch discount — use code",

  /** Optional expiry line shown below the code, e.g. "Ends Sunday" — leave "" to hide */
  expiryLabel: "",

  /** Banner accent colour */
  color:       "blue" as "blue" | "green" | "amber" | "red",
};
