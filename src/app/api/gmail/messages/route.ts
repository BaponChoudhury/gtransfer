import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listMessagesWithLargeAttachments } from "@/lib/google/gmail";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  const pageToken = searchParams.get("pageToken") ?? undefined;
  const minSizeMB = parseInt(searchParams.get("minSizeMB") ?? "5");

  if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("connected_accounts")
    .select("access_token, refresh_token")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .single();

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  try {
    const data = await listMessagesWithLargeAttachments(
      account.access_token,
      account.refresh_token,
      { pageToken, minSizeBytes: minSizeMB * 1024 * 1024 }
    );
    return NextResponse.json(data);
  } catch (err) {
    console.error("Gmail list error:", err);
    return NextResponse.json({ error: "Failed to list messages" }, { status: 500 });
  }
}
