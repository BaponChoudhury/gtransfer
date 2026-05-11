import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { connectMega } from "@/lib/mega/client";
import { testDrimeConnection, isSanctumToken } from "@/lib/drime/client";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("external_accounts")
    .select("id, provider, email, display_name, created_at")
    .eq("user_id", user.id);

  return NextResponse.json({ accounts: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (profile?.plan !== "pro") return NextResponse.json({ error: "Pro plan required to connect external accounts." }, { status: 403 });

  const { provider, email, password, sid, key, name: megaName, user: megaUser } = await request.json();

  // Test connection before saving
  // Note: skip server-side verification for Mega SID — the SID came from the user's own
  // browser session (via bookmarklet), so it's already authenticated. Connecting from our
  // server IP would just trigger Mega's IP-block again.
  try {
    if (provider === "mega") {
      if (!sid) {
        // Only verify email+password logins (SID logins skip this)
        await connectMega({ email, password });
      }
    } else if (provider === "drime") {
      const credType = isSanctumToken(password ?? "") ? "token" : "password";
      const ok = await testDrimeConnection({ email, password, credType });
      if (!ok) throw new Error("Connection failed");
    } else {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: detail }, { status: 400 });
  }

  const credType = provider === "drime" && isSanctumToken(password ?? "") ? "token" : "password";
  const encrypted = encrypt(JSON.stringify(
    sid
      ? { email, sid, key, name: megaName, user: megaUser }
      : provider === "drime"
        ? { email, password, credType }
        : { email, password }
  ));

  // If email is empty (Mega didn't expose it via bookmarklet), use a placeholder so the
  // upsert doesn't conflict with other empty-email rows for the same provider.
  const displayEmail = email || `mega-${sid!.slice(0, 8)}`;
  const upsertEmail = email || displayEmail;

  const { data, error } = await supabase.from("external_accounts").upsert({
    user_id: user.id,
    provider,
    email: upsertEmail,
    display_name: displayEmail,
    encrypted_credentials: encrypted,
  }, { onConflict: "user_id,provider,email" }).select("id, provider, email, display_name, created_at").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ account: data });
}

export async function DELETE(request: NextRequest) {
  const { accountId } = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase.from("external_accounts").delete().eq("id", accountId).eq("user_id", user.id);
  return NextResponse.json({ success: true });
}
