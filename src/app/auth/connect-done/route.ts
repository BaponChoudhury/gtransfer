import { NextRequest, NextResponse } from "next/server";

/**
 * Relay route — receives the browser after a successful Google OAuth callback.
 *
 * The OAuth callback lives under /api/auth/*, which is excluded from the proxy
 * middleware (proxy.ts matcher). That means session cookies set during the
 * callback are NOT validated/refreshed by middleware before the browser reaches
 * the dashboard, causing the dashboard layout's getUser() to fail and redirect
 * back to login.
 *
 * By routing through /auth/connect-done first, the proxy middleware runs,
 * confirms the Supabase session is valid, refreshes tokens if needed, and
 * sets the correct Set-Cookie headers on the response — so the subsequent
 * navigation to the dashboard finds a fully initialised session.
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  return NextResponse.redirect(`${appUrl}/dashboard/accounts?connected=true`);
}
