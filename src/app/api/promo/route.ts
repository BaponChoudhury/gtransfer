import { NextResponse } from "next/server";
import { getLivePrices } from "@/lib/settings";

/** Public endpoint — returns only the promo banner settings (no pricing data). */
export async function GET() {
  const prices = await getLivePrices();
  return NextResponse.json(prices.promo, {
    headers: { "Cache-Control": "no-store" },
  });
}
