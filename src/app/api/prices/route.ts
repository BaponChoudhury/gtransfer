import { NextResponse } from "next/server";
import { getLivePrices } from "@/lib/settings";

/** Public endpoint — returns display prices for the pricing page. */
export async function GET() {
  const prices = await getLivePrices();
  return NextResponse.json({
    essential: {
      gbpDisplay: prices.essential.gbpDisplay,
      inrAmount:  prices.essential.inrAmount,
      inrDisplay: prices.essential.inrDisplay,
    },
    pro: {
      gbpDisplay: prices.pro.gbpDisplay,
      inrAmount:  prices.pro.inrAmount,
      inrDisplay: prices.pro.inrDisplay,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
