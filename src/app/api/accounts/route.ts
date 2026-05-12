import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [accountsResult, profileResult] = await Promise.all([
    supabase
      .from("connected_accounts")
      .select("id, google_email, display_name, avatar_url, role, scopes, created_at, token_expiry")
      .eq("user_id", user.id)
      .order("created_at"),
    supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single(),
  ]);

  if (accountsResult.error) return NextResponse.json({ error: accountsResult.error.message }, { status: 500 });
  return NextResponse.json({ accounts: accountsResult.data, plan: profileResult.data?.plan ?? "free" });
}

export async function DELETE(request: NextRequest) {
  const { accountId } = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("connected_accounts")
    .delete()
    .eq("id", accountId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
