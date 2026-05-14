import { redirect } from "next/navigation";

// force-dynamic so Next.js never pre-renders this relay page
export const dynamic = "force-dynamic";

/**
 * Safety-net relay page.  In normal operation this component is never
 * rendered: proxy.ts intercepts every request to /auth/connect-done and
 * issues the redirect to /dashboard/accounts itself so that any freshly-
 * rotated session cookies are included in the redirect response.
 *
 * This page exists only as a fallback in case the proxy is somehow bypassed.
 */
export default async function ConnectDonePage() {
  redirect("/dashboard/accounts?connected=true");
}
