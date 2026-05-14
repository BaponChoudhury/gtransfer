import { redirect } from "next/navigation";

// force-dynamic so Next.js never pre-renders this relay page
export const dynamic = "force-dynamic";

/**
 * Relay page — lands here after a successful Google OAuth connect callback.
 *
 * WHY this exists as a Server Component instead of a direct Route Handler
 * redirect:
 *
 * The callback lives under /api/auth/*, which is excluded from the proxy
 * middleware matcher. When the proxy runs for this page it can refresh the
 * Supabase access token and write updated cookies onto the NextResponse.next()
 * response. Next.js merges those middleware Set-Cookie headers into Server
 * Component responses (including redirect responses), so the browser always
 * receives the refreshed session before navigating to the dashboard.
 *
 * We intentionally do NOT call getUser() here because the proxy already did
 * it, and a second call risks a double-refresh: if the proxy consumed the
 * refresh token, this call would fail even though the session is valid. The
 * dashboard layout performs the authoritative auth check.
 */
export default async function ConnectDonePage() {
  redirect("/dashboard/accounts?connected=true");
}
