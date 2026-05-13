import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendAdminNewUserNotification } from "@/lib/email";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Detect new signups: created_at and last_sign_in_at are equal on first login
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const createdAt     = new Date(user.created_at).getTime();
          const lastSignIn    = new Date(user.last_sign_in_at ?? 0).getTime();
          const isNewUser     = Math.abs(createdAt - lastSignIn) < 5_000; // within 5 s
          if (isNewUser) {
            const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
            // Fire-and-forget — don't block the redirect
            sendAdminNewUserNotification({ userEmail: user.email!, userName: name });
          }
        }
      } catch (e) {
        console.error("New user notification error:", e);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
