import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminNewUserNotification } from "@/lib/email";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Ensure a profiles row exists for this user.  The DB trigger
          // on_auth_user_created is supposed to handle this, but it can fail
          // silently if it encounters a constraint violation (e.g. null email
          // stored differently for OAuth sign-ins).  This upsert is a
          // belt-and-suspenders guarantee that every successful login always
          // has a profile row.  ignoreDuplicates makes it a no-op when the row
          // already exists, so it is safe to run on every login.
          const admin = createAdminClient();
          const { error: profileError } = await admin
            .from("profiles")
            .upsert(
              {
                id:                 user.id,
                email:              user.email ?? user.user_metadata?.email ?? "",
                full_name:          user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
                avatar_url:         user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
                is_premium:         false,
                plan:               "free",
                email_transfer_bytes: 0,
              } as never,
              { onConflict: "id", ignoreDuplicates: true }
            );
          if (profileError) {
            console.error("[auth/callback] profile upsert error:", profileError);
          }

          // New-user admin notification — await before redirect so the
          // serverless function doesn't terminate with the request in-flight.
          const ageMs = Date.now() - new Date(user.created_at).getTime();
          const isNewUser = ageMs < 60_000; // 60s window — OAuth flows can take ~30s
          const userEmail = user.email ?? user.user_metadata?.email ?? null;
          console.log(`[auth/callback] ageMs: ${ageMs} | isNewUser: ${isNewUser} | email: ${userEmail ?? "null"}`);
          if (isNewUser && userEmail) {
            const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
            await sendAdminNewUserNotification({ userEmail, userName: name });
          }
        }
      } catch (e) {
        console.error("[auth/callback] post-login error:", e);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
