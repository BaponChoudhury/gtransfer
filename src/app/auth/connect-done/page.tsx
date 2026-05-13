import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Relay page — receives the browser after a successful Google OAuth callback.
 *
 * WHY a Server Component page instead of a Route Handler:
 *
 * The OAuth callback lives under /api/auth/*, which is excluded from the
 * proxy middleware matcher. After the callback sets session cookies and the
 * browser arrives here, the proxy middleware runs and validates (or refreshes)
 * the Supabase session.
 *
 * If the access token has expired, the middleware refreshes it and writes new
 * cookies onto its NextResponse.next() response. With a Route Handler, those
 * middleware-level Set-Cookie headers are NOT forwarded to the browser because
 * the handler returns its own NextResponse.redirect(). The browser never
 * receives the refreshed tokens, the refresh token is consumed, and the next
 * request to the dashboard finds an invalid session → redirect to /login.
 *
 * Using a Server Component page ensures that Next.js merges middleware cookies
 * into the page response before it reaches the browser, so the refreshed
 * session is always delivered.
 */
export default async function ConnectDonePage() {
  // The proxy middleware has already run and refreshed the session if needed.
  // This explicit check is a safety net: it lets us catch any edge case where
  // the session is genuinely missing and surface a clear error rather than
  // silently landing on an odd state.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Session is genuinely gone — send to login rather than looping forever.
    redirect("/login?error=session_lost");
  }

  redirect("/dashboard/accounts?connected=true");
}
