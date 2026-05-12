import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGoogleAuthUrl } from "@/lib/google/oauth";
import crypto from "crypto";

/** Max connected Google accounts per plan. */
const ACCOUNT_LIMITS: Record<string, number> = {
  free:      2,   // 1 primary + 1 secondary
  essential: Infinity,
  pro:       Infinity,
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const isSecure = appUrl.startsWith("https");

  // Check account limit for the user's plan
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan ?? "free";
  const limit = ACCOUNT_LIMITS[plan] ?? 2;

  const { count } = await admin
    .from("connected_accounts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= limit) {
    return NextResponse.redirect(`${appUrl}/dashboard/accounts?error=account_limit`);
  }

  const state = crypto.randomBytes(16).toString("hex");

  const response = NextResponse.redirect(getGoogleAuthUrl(state));
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: 600,
  });
  response.cookies.set("google_oauth_user", user.id, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: 600,
  });

  return response;
}
