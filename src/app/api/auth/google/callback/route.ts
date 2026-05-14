import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForTokens, getGoogleUserInfo } from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${origin}/dashboard/accounts?error=oauth_denied`);
  }

  const storedState = request.cookies.get("google_oauth_state")?.value;
  const userId = request.cookies.get("google_oauth_user")?.value;

  if (!storedState || storedState !== state || !userId) {
    return NextResponse.redirect(`${origin}/dashboard/accounts?error=invalid_state`);
  }

  console.log("[google/callback] starting — userId:", userId?.slice(0, 8));

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
          token_expiry: new Date(tokens.expiry_date ?? Date.now() + 3600_000).toISOString(),
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
    response.cookies.delete("google_oauth_state");
    response.cookies.delete("google_oauth_user");

    return response;
  } catch (err) {
    console.error("[google/callback] fatal error:", err);
    return NextResponse.redirect(`${origin}/dashboard/accounts?error=connection_failed`);
  }
}
