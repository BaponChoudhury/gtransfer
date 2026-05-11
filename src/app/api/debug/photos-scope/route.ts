import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOAuth2Client } from "@/lib/google/oauth";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: accounts } = await admin
    .from("connected_accounts")
    .select("id, google_email, role, scopes, refresh_token, access_token")
    .eq("user_id", user.id);

  if (!accounts) return NextResponse.json({ error: "No accounts" });

  const results = await Promise.all(accounts.map(async (acct) => {
    try {
      const auth = createOAuth2Client(acct.access_token, acct.refresh_token);
      const { credentials } = await auth.refreshAccessToken();
      return {
        email: acct.google_email,
        role: acct.role,
        storedScopes: acct.scopes,
        liveScopes: credentials.scope,
        hasPhotos: credentials.scope?.includes("photoslibrary") ?? false,
      };
    } catch (e) {
      return {
        email: acct.google_email,
        role: acct.role,
        storedScopes: acct.scopes,
        error: String(e),
      };
    }
  }));

  return NextResponse.json(results);
}
