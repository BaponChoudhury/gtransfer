// Middleware — refreshes the Supabase session on every request so that
// server components always receive a valid (non-expired) access token.
//
// KEY DESIGN DECISION: we use `cookies()` from next/headers rather than
// `request.cookies` + `NextResponse.next({ request })`.
//
// Both the proxy and Server Components call `await cookies()` from the same
// next/headers module, which returns the shared cookie store for the current
// request/response cycle.  When setAll() writes refreshed tokens into that
// store, Server Components reading the same store in the same render pass
// automatically see the updated values.  This eliminates the race where the
// proxy refreshes (consuming refresh_token_R1 → R2) but Server Components
// still read R1 from the original request headers and try — and fail — to
// refresh again.
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Public API paths that don't require a user session. */
const PUBLIC_API_PATHS = [
  "/api/prices",
  "/api/payments/stripe/webhook",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Shared cookie store — readable AND writable here (proxy runs in Node.js
  // runtime).  Any Set-Cookie headers produced by setAll() are automatically
  // flushed onto the response that this function returns.
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
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
    cookieStore.getAll()
      .filter((c) => c.name.startsWith("sb-"))
      .forEach((c) => cleanResp.cookies.delete(c.name));
    return cleanResp;
  }

  // /auth/connect-done relay: redirect from the proxy so that any cookies
  // written by setAll() above (freshly-rotated session tokens) are reliably
  // included in the redirect response.  Because we now use the shared
  // cookieStore, the Set-Cookie headers are flushed automatically — no manual
  // cookie copying required.
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
    return NextResponse.redirect(dest);
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
