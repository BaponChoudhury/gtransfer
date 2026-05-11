import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDriveStorageQuota } from "@/lib/google/drive";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
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
    const quota = await getDriveStorageQuota(account.access_token, account.refresh_token);
    return NextResponse.json({
      limit:            quota?.limit            ? Number(quota.limit)            : null,
      usage:            quota?.usage            ? Number(quota.usage)            : null,
      usageInDrive:     quota?.usageInDrive     ? Number(quota.usageInDrive)     : null,
      usageInDriveTrash:quota?.usageInDriveTrash? Number(quota.usageInDriveTrash): null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Drive quota error:", message);
    return NextResponse.json({ error: "Failed to fetch quota", detail: message }, { status: 500 });
  }
}
