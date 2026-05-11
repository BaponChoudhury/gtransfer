import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleAuthUrl } from "@/lib/google/oauth";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = crypto.randomBytes(16).toString("hex");
  const cookieStore = request.cookies;
  const isSecure = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https");

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
