export type Plan = "free" | "essential" | "pro";

/** Free tier cumulative email transfer cap: 10 GB */
export const FREE_EMAIL_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;

// Prices are maintained in src/lib/pricing.ts — import from there, not here.
import { PLAN_PRICES } from "./pricing";

export const PLAN_META: Record<Plan, { label: string; price: string | null; pricePence: number }> = {
  free:      { label: "Free",      price: null,                              pricePence: 0 },
  essential: { label: "Essential", price: PLAN_PRICES.essential.gbpDisplay,  pricePence: PLAN_PRICES.essential.gbpAmount },
  pro:       { label: "Pro",       price: PLAN_PRICES.pro.gbpDisplay,        pricePence: PLAN_PRICES.pro.gbpAmount },
};

/** INR prices shown to Indian customers (UPI payment) */
export const UPI_PRICES: Record<"essential" | "pro", { amount: number; display: string }> = {
  essential: { amount: PLAN_PRICES.essential.inrAmount, display: PLAN_PRICES.essential.inrDisplay },
  pro:       { amount: PLAN_PRICES.pro.inrAmount,       display: PLAN_PRICES.pro.inrDisplay },
};

type Feature = "gmail" | "drive" | "photos" | "external";

/** Returns true if the given plan grants access to a feature. */
export function planAllows(plan: Plan | null | undefined, feature: Feature): boolean {
  const p = plan ?? "free";
  switch (feature) {
    case "gmail":    return true;                                 // all plans
    case "drive":    return p === "essential" || p === "pro";
    case "photos":   return p === "essential" || p === "pro";
    case "external": return p === "pro";
  }
}

/** Badge label for a plan. */
export function planLabel(plan: Plan | null | undefined): string {
  return PLAN_META[plan ?? "free"].label.toUpperCase();
}

/** Badge variant for a plan (maps to Badge component variants). */
export function planBadgeVariant(plan: Plan | null | undefined): "premium" | "default" | "secondary" {
  switch (plan ?? "free") {
    case "pro":       return "premium";
    case "essential": return "default";
    default:          return "secondary";
  }
}
