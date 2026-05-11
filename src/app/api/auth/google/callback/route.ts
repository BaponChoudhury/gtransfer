import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForTokens, getGoogleUserInfo } from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/dashboard/accounts?error=oauth_denied`);
  }

  const storedState = request.cookies.get("google_oauth_state")?.value;
  const userId = request.cookies.get("google_oauth_user")?.value;

  if (!storedState || storedState !== state || !userId) {
    return NextResponse.redirect(`${appUrl}/dashboard/accounts?error=invalid_state`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Missing tokens");
    }

    const userInfo = await getGoogleUserInfo(tokens.access_token);
    if (!userInfo.id || !userInfo.email) throw new Error("Missing user info");

    const supabase = createAdminClient();

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

    if (upsertError) throw upsertError;

    const response = NextResponse.redirect(`${appUrl}/dashboard/accounts?connected=true`);
    response.cookies.delete("google_oauth_state");
    response.cookies.delete("google_oauth_user");
    return response;
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(`${appUrl}/dashboard/accounts?error=connection_failed`);
  }
}
