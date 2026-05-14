// Middleware — refreshes the Supabase session on every request so that
// server components always receive a valid (non-expired) access token.
// Only middleware can write Set-Cookie headers on the response; server
// components are read-only, so session refresh MUST happen here.
//
// Cookie propagation: setAll() writes refreshed tokens to request.cookies so
// downstream Server Components reading cookies() from next/headers see the
// updated values, and to response.cookies so the browser stores them.
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** Public API paths that don't require a user session. */
const PUBLIC_API_PATHS = [
  "/api/prices",
  "/api/payments/stripe/webhook",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Start with a plain next-response; setAll() below may replace it so that
  // refreshed session cookies are forwarded to the browser.
  let response = NextResponse.next({ request });

  // Use request.cookies (not next/headers cookies()) so we reliably read the
  // full incoming HTTP cookie jar.  In middleware, cookies() from next/headers
  // only reflects cookies set within the current middleware execution, not the
  // browser's incoming cookies.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write onto the request so downstream Server Components see the
          // refreshed tokens, then rebuild response so the browser gets them.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the JWT server-side and triggers a refresh if needed.
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // If the refresh token was already consumed (race: a concurrent request
  // refreshed first, or the session was invalidated server-side), clear the
  // stale cookies and redirect to login for a clean recovery rather than
  // bouncing the user through the dashboard with a broken session.
  if (authError?.code === "refresh_token_not_found") {
    console.log("[proxy] stale refresh token — clearing session and redirecting to login");
    const loginUrl = new URL("/login?error=session_expired", request.url);
    const cleanResp = NextResponse.redirect(loginUrl);
    request.cookies
      .getAll()
      .filter((c) => c.name.startsWith("sb-"))
      .forEach((c) => cleanResp.cookies.delete(c.name));
    return cleanResp;
  }

  // /auth/connect-done relay: redirect FROM THE PROXY so that any cookies
  // written by setAll() above (freshly-rotated session tokens) are reliably
  // included in the redirect response sent to the browser.
  if (pathname === "/auth/connect-done") {
    console.log("[proxy/connect-done] user:", user?.id?.slice(0, 8) ?? "null", "| error:", authError?.message ?? "none");

    const dest = request.nextUrl.clone();
    if (user) {
      dest.pathname = "/dashboard/accounts";
      dest.search   = "connected=true";
    } else {
      dest.pathname = "/login";
      dest.search   = "error=session_lost";
    }

    const redirectResp = NextResponse.redirect(dest);
    // Copy any freshly-rotated session cookies into the redirect response.
    response.cookies.getAll().forEach((cookie) => {
      redirectResp.cookies.set(cookie.name, cookie.value, {
        path:     cookie.path     ?? "/",
        sameSite: cookie.sameSite as "lax" | "strict" | "none" | undefined,
        httpOnly: cookie.httpOnly,
        secure:   cookie.secure,
        maxAge:   cookie.maxAge,
        expires:  cookie.expires,
      });
    });
    return redirectResp;
  }

  const isApiPath   = pathname.startsWith("/api/");
  const loggedIn    = !!user;
  const isPublicApi = PUBLIC_API_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // API routes: return JSON 401 for unauthenticated requests so callers never
  // receive an HTML redirect that the RSC router would try to JSON.parse.
  if (!loggedIn && isApiPath && !isPublicApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Convenience: redirect "/" → "/dashboard" for logged-in users.
  if (loggedIn && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
