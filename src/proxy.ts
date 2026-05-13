// Middleware — refreshes the Supabase session on every request so that
// server components always receive a valid (non-expired) access token.
// Only middleware can write Set-Cookie headers on the response; server
// components are read-only, so session refresh MUST happen here.
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

  // Refresh the Supabase session.  If the access token is expired the client
  // will use the refresh token and write updated cookies onto `response`.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies onto the *request* so downstream handlers see them,
          // then rebuild the response so the browser receives Set-Cookie headers.
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
  const { data: { user } } = await supabase.auth.getUser();

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
