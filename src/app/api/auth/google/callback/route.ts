import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForTokens, getGoogleUserInfo } from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    console.log("[google/callback] denied or missing code — error:", error);
    return NextResponse.redirect(`${origin}/dashboard/accounts?error=oauth_denied`);
  }

  // Diagnostic: log which cookies arrived so we can trace incognito issues.
  const cookieNames = request.cookies.getAll().map((c) => c.name).join(", ");
  console.log("[google/callback] cookies present:", cookieNames || "none");

  const storedState = request.cookies.get("google_oauth_state")?.value;
  let userId    = request.cookies.get("google_oauth_user")?.value;

  console.log("[google/callback] storedState:", storedState ? "present" : "MISSING");
  console.log("[google/callback] userId cookie:", userId    ? "present" : "MISSING");
  console.log("[google/callback] state match:", storedState && state && storedState === state ? "yes" : "no");

  // CSRF guard: the state URL param must match what we stored in the cookie.
  if (!storedState || storedState !== state) {
    console.log("[google/callback] state mismatch — possible CSRF or dropped cookie");
    return NextResponse.redirect(`${origin}/dashboard/accounts?error=invalid_state`);
  }

  // User ID: prefer the cookie, fall back to the live Supabase session so the
  // flow still works even if the google_oauth_user cookie was dropped (e.g. by
  // certain Chrome incognito cookie-partitioning policies).
  if (!userId) {
    console.log("[google/callback] userId cookie missing — falling back to Supabase session");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? undefined;
    console.log("[google/callback] session fallback userId:", userId ? userId.slice(0, 8) : "null");
  }

  if (!userId) {
    console.log("[google/callback] no userId from cookie or session — cannot proceed");
    return NextResponse.redirect(`${origin}/login?error=session_lost`);
  }

  console.log("[google/callback] starting — userId:", userId.slice(0, 8));

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Missing tokens");
    }

    const userInfo = await getGoogleUserInfo(tokens.access_token);
    if (!userInfo.id || !userInfo.email) throw new Error("Missing user info");
    console.log("[google/callback] google user:", userInfo.email);

    const supabase = createAdminClient();

    // Ensure profiles row exists with all required fields. The DB trigger
    // normally handles this on first Supabase auth sign-in, but if it ever
    // fails this upsert is a safety net. ignoreDuplicates means existing rows
    // are untouched while missing rows are created with sane defaults.
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          email: userInfo.email,
          full_name: userInfo.name ?? null,
          avatar_url: userInfo.picture ?? null,
          is_premium: false,
          plan: "free",
          email_transfer_bytes: 0,
        } as never,
        { onConflict: "id", ignoreDuplicates: true }
      );
    if (profileError) console.error("Profile upsert error:", profileError);

    // Count existing accounts to determine role
    const { count } = await supabase
      .from("connected_accounts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const role = (count ?? 0) === 0 ? "primary" : "secondary";

    // Upsert connected account
    const { error: upsertError } = await supabase
      .from("connected_accounts")
      .upsert(
        {
          user_id: userId,
          google_id: userInfo.id,
          google_email: userInfo.email,
          display_name: userInfo.name ?? null,
          avatar_url: userInfo.picture ?? null,
          role,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: new Date(tokens.expiry_date ?? Date.now() + 3_600_000).toISOString(),
          scopes: (tokens.scope ?? "").split(" ").filter(Boolean),
        },
        { onConflict: "user_id,google_id" }
      );

    if (upsertError) {
      console.error("[google/callback] connected_accounts upsert error:", upsertError);
      throw upsertError;
    }
    console.log("[google/callback] account saved, role:", role);

    // Redirect via /auth/connect-done instead of directly to the dashboard.
    // The callback route is excluded from the proxy middleware (api/auth prefix),
    // so a direct redirect to /dashboard would bypass the session-refresh middleware
    // and the dashboard layout's getUser() would fail, bouncing back to login.
    // /auth/connect-done IS covered by the middleware, which refreshes the session
    // before the final redirect reaches the dashboard.
    const response = NextResponse.redirect(`${origin}/auth/connect-done`);
    response.cookies.delete({ name: "google_oauth_state", path: "/" });
    response.cookies.delete({ name: "google_oauth_user",  path: "/" });

    return response;
  } catch (err) {
    console.error("[google/callback] fatal error:", err);
    return NextResponse.redirect(`${origin}/dashboard/accounts?error=connection_failed`);
  }
}
