import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // 1. Vercel sets this header automatically in production
  const vercelCountry = request.headers.get("x-vercel-ip-country");
  if (vercelCountry) {
    return NextResponse.json({ country: vercelCountry });
  }

  // 2. Try Cloudflare header
  const cfCountry = request.headers.get("cf-ipcountry");
  if (cfCountry && cfCountry !== "XX") {
    return NextResponse.json({ country: cfCountry });
  }

  // 3. Fall back to free IP geolocation API using the real IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : null;

  // Skip lookup for localhost / private IPs
  const isLocal = !ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.");
  if (isLocal) {
    // In development, default to non-India so Stripe is shown by default
    return NextResponse.json({ country: "GB", source: "local" });
  }

  try {
    const res  = await fetch(`https://ipapi.co/${ip}/country/`, { next: { revalidate: 3600 } });
    const code = (await res.text()).trim().toUpperCase();
    return NextResponse.json({ country: code });
  } catch {
    return NextResponse.json({ country: "GB", source: "fallback" });
  }
}
