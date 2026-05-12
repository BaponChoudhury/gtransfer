// Lightweight proxy — no heavy npm imports so Turbopack compiles this instantly.
// Real auth verification happens inside each API route handler and dashboard/layout.tsx.
import { NextResponse, type NextRequest } from "next/server";

/** Returns true if any Supabase auth cookie is present (session may still be expired).
 *  Handles chunked cookies: sb-xxx-auth-token, sb-xxx-auth-token.0, .1, etc. */
function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    ({ name }) => name.startsWith("sb-") && name.includes("auth-token")
  );
}

/** Public API paths that don't require a user session. */
const PUBLIC_API_PATHS = [
  "/api/prices",
  "/api/payments/stripe/webhook",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiPath = pathname.startsWith("/api/");
  const loggedIn = hasAuthCookie(request);

  // API routes: return JSON 401 immediately for unauthenticated requests.
  // This ensures API callers never receive an HTML redirect that would crash
  // the RSC router ("Unexpected token '<'" JSON parse error).
  // Public API routes (prices, webhooks) are exempt from the auth check.
  const isPublicApi = PUBLIC_API_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));
  if (!loggedIn && isApiPath && !isPublicApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Page routes: do NOT redirect here. dashboard/layout.tsx calls redirect("/login")
  // which triggers a proper RSC-level redirect — not an HTML 307 that the RSC
  // router would try to JSON.parse and crash on.

  // Convenience: redirect "/" → "/dashboard" for logged-in users.
  if (loggedIn && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
