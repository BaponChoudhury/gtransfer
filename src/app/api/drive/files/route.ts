import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listDriveFiles, getDriveStorageQuota } from "@/lib/google/drive";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  const pageToken = searchParams.get("pageToken") ?? undefined;
  const query = searchParams.get("q") ?? undefined;

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
    const data = await listDriveFiles(account.access_token, account.refresh_token, {
      pageToken,
      query,
    });
    return NextResponse.json({ files: data.files ?? [], nextPageToken: data.nextPageToken });
  } catch (err) {
    console.error("Drive list error:", err);
    return NextResponse.json({ error: "Failed to list files" }, { status: 500 });
  }
}
