/**
 * Live app settings — reads from Supabase app_settings table.
 * Falls back to the hardcoded values in pricing.ts if the DB is unavailable.
 */
import { createAdminClient } from "./supabase/admin";
import { PLAN_PRICES, PROMO_BANNER } from "./pricing";

export interface LivePrices {
  essential: { gbpPence: number; gbpDisplay: string; inrAmount: number; inrDisplay: string };
  pro:       { gbpPence: number; gbpDisplay: string; inrAmount: number; inrDisplay: string };
  promo: {
    enabled:     boolean;
    code:        string;
    message:     string;
    expiryLabel: string;
    color:       "blue" | "green" | "amber" | "red";
  };
}

function defaults(): LivePrices {
  return {
    essential: {
      gbpPence:   PLAN_PRICES.essential.gbpAmount,
      gbpDisplay: PLAN_PRICES.essential.gbpDisplay,
      inrAmount:  PLAN_PRICES.essential.inrAmount,
      inrDisplay: PLAN_PRICES.essential.inrDisplay,
    },
    pro: {
      gbpPence:   PLAN_PRICES.pro.gbpAmount,
      gbpDisplay: PLAN_PRICES.pro.gbpDisplay,
      inrAmount:  PLAN_PRICES.pro.inrAmount,
      inrDisplay: PLAN_PRICES.pro.inrDisplay,
    },
    promo: {
      enabled:     PROMO_BANNER.enabled,
      code:        PROMO_BANNER.code,
      message:     PROMO_BANNER.message,
      expiryLabel: PROMO_BANNER.expiryLabel,
      color:       PROMO_BANNER.color,
    },
  };
}

/** Loads live prices from DB. Cached in-process for 60 seconds. */
let cache: { data: LivePrices; ts: number } | null = null;

export async function getLivePrices(): Promise<LivePrices> {
  if (cache && Date.now() - cache.ts < 60_000) return cache.data;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("app_settings").select("key, value");
    if (error || !data) return defaults();

    const s: Record<string, unknown> = {};
    for (const row of data) s[row.key] = row.value;

    const result: LivePrices = {
      essential: {
        gbpPence:   Number(s["essential_gbp_pence"]   ?? PLAN_PRICES.essential.gbpAmount),
        gbpDisplay: String(s["essential_gbp_display"] ?? PLAN_PRICES.essential.gbpDisplay),
        inrAmount:  Number(s["essential_inr_amount"]  ?? PLAN_PRICES.essential.inrAmount),
        inrDisplay: String(s["essential_inr_display"] ?? PLAN_PRICES.essential.inrDisplay),
      },
      pro: {
        gbpPence:   Number(s["pro_gbp_pence"]   ?? PLAN_PRICES.pro.gbpAmount),
        gbpDisplay: String(s["pro_gbp_display"] ?? PLAN_PRICES.pro.gbpDisplay),
        inrAmount:  Number(s["pro_inr_amount"]  ?? PLAN_PRICES.pro.inrAmount),
        inrDisplay: String(s["pro_inr_display"] ?? PLAN_PRICES.pro.inrDisplay),
      },
      promo: {
        enabled:     Boolean(s["promo_enabled"] ?? false),
        code:        String(s["promo_code"]     ?? ""),
        message:     String(s["promo_message"]  ?? ""),
        expiryLabel: String(s["promo_expiry"]   ?? ""),
        color:       (s["promo_color"] as LivePrices["promo"]["color"]) ?? "blue",
      },
    };

    cache = { data: result, ts: Date.now() };
    return result;
  } catch {
    return defaults();
  }
}

/** Call this after saving settings to force the next request to re-read from DB */
export function invalidatePriceCache() {
  cache = null;
}
