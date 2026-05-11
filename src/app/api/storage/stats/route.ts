import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDriveStorageQuota } from "@/lib/google/drive";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Fetch all connected accounts
  const { data: accounts } = await admin
    .from("connected_accounts")
    .select("id, google_email, role, access_token, refresh_token")
    .eq("user_id", user.id)
    .order("role", { ascending: true }); // primary first

  if (!accounts?.length) return NextResponse.json({ accounts: [], savings: [] });

  // Fetch Drive quota for every account in parallel
  const quotas = await Promise.all(
    accounts.map(async (acc) => {
      try {
        const quota = await getDriveStorageQuota(acc.access_token, acc.refresh_token);
        return {
          id: acc.id,
          google_email: acc.google_email,
          role: acc.role,
          limit: Number(quota?.limit ?? 0),
          usage: Number(quota?.usage ?? 0),
          usageInDrive: Number(quota?.usageInDrive ?? 0),
        };
      } catch {
        return {
          id: acc.id,
          google_email: acc.google_email,
          role: acc.role,
          limit: 0,
          usage: 0,
          usageInDrive: 0,
        };
      }
    })
  );

  // Fetch completed "move" transfer jobs to calculate actual savings
  const { data: moveJobs } = await admin
    .from("transfer_jobs")
    .select("type, transferred_bytes, source_account_id")
    .eq("user_id", user.id)
    .eq("action", "move")
    .eq("status", "completed");

  // Also fetch all completed transfers (copy + move) to show total transferred
  const { data: allJobs } = await admin
    .from("transfer_jobs")
    .select("type, transferred_bytes, transferred_files, action")
    .eq("user_id", user.id)
    .eq("status", "completed");

  // Bytes freed per source account broken down by type
  type SavingEntry = { accountId: string; drive: number; gmail: number; photos: number; total: number };
  const savingsMap = new Map<string, SavingEntry>();

  for (const job of moveJobs ?? []) {
    const bytes = Number(job.transferred_bytes ?? 0);
    if (!savingsMap.has(job.source_account_id)) {
      savingsMap.set(job.source_account_id, { accountId: job.source_account_id, drive: 0, gmail: 0, photos: 0, total: 0 });
    }
    const entry = savingsMap.get(job.source_account_id)!;
    if (job.type === "drive") entry.drive += bytes;
    else if (job.type === "gmail_attachment") entry.gmail += bytes;
    else if (job.type === "photos") entry.photos += bytes;
    entry.total += bytes;
  }

  // Overall transfer totals (for the summary cards)
  const totals = { drive: 0, gmail: 0, photos: 0, files: 0 };
  for (const job of allJobs ?? []) {
    const bytes = Number(job.transferred_bytes ?? 0);
    const files = Number(job.transferred_files ?? 0);
    if (job.type === "drive") totals.drive += bytes;
    else if (job.type === "gmail_attachment") totals.gmail += bytes;
    else if (job.type === "photos") totals.photos += bytes;
    totals.files += files;
  }

  return NextResponse.json({
    accounts: quotas,
    savings: Array.from(savingsMap.values()),
    totals,
  });
}
