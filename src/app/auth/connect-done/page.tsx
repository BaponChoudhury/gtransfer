import { redirect } from "next/navigation";

/**
 * Relay page — receives the browser after a successful Google OAuth callback.
 *
 * WHY a Server Component page instead of a Route Handler:
 *
 * The OAuth callback lives under /api/auth/*, which is excluded from the
 * proxy middleware (proxy.ts matcher). After the callback sets session cookies
 * and the browser arrives here, the proxy middleware runs and validates (or
 * refreshes) the Supabase session.
 *
 * If the access token has expired, the middleware refreshes it and writes new
 * cookies onto its NextResponse.next() response. With a Route Handler, those
 * middleware-level Set-Cookie headers may NOT be forwarded to the browser
 * because the handler returns its own NextResponse.redirect(). This means the
 * browser never receives the refreshed tokens, the old refresh token is
 * consumed, and the next request to the dashboard finds an expired/invalid
 * session → redirect to /login.
 *
 * Using a Server Component page instead ensures that Next.js merges the
 * middleware cookies into the rendered-page response before it reaches the
 * browser, so the refreshed session is always delivered. The redirect() call
 * is then followed with valid, up-to-date session cookies in the browser.
 */
export default function ConnectDonePage() {
  redirect("/dashboard/accounts?connected=true");
}
