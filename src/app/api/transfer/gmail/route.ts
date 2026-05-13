import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRawMessage, insertMessage, trashMessage } from "@/lib/google/gmail";
import { FREE_EMAIL_LIMIT_BYTES, type Plan } from "@/lib/plan";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sourceAccountId, destinationAccountId, messages, action } = await request.json();

  // Load plan + current usage
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, email_transfer_bytes")
    .eq("id", user.id)
    .single();

  const plan: Plan = (profile?.plan as Plan) ?? "free";

  // Free tier: enforce 10 GB cumulative cap
  if (plan === "free") {
    const incomingBytes = messages.reduce((s: number, m: { sizeEstimate?: number }) => s + (m.sizeEstimate ?? 0), 0);
    const usedBytes = profile?.email_transfer_bytes ?? 0;
    if (usedBytes + incomingBytes > FREE_EMAIL_LIMIT_BYTES) {
      const usedGB = (usedBytes / (1024 ** 3)).toFixed(1);
      return NextResponse.json({
        error: `Free plan limit reached (${usedGB} GB of 10 GB used). Upgrade to Essential for unlimited email transfers.`,
      }, { status: 403 });
    }
  }

  const admin = createAdminClient();

  const { data: accounts } = await admin
    .from("connected_accounts")
    .select("id, access_token, refresh_token")
    .in("id", [sourceAccountId, destinationAccountId])
    .eq("user_id", user.id);

  if (!accounts || accounts.length < 2)
    return NextResponse.json({ error: "Accounts not found" }, { status: 404 });

  const source = accounts.find((a) => a.id === sourceAccountId)!;
  const dest   = accounts.find((a) => a.id === destinationAccountId)!;

  const { data: job } = await admin.from("transfer_jobs").insert({
    user_id: user.id,
    type: "gmail_attachment",
    action,
    source_account_id: sourceAccountId,
    destination_account_id: destinationAccountId,
    source_items: messages,
    status: "running",
    total_files: messages.length,
    transferred_files: 0,
    total_bytes: messages.reduce((s: number, m: { sizeEstimate?: number }) => s + (m.sizeEstimate ?? 0), 0),
    transferred_bytes: 0,
  }).select().single();

  if (!job) return NextResponse.json({ error: "Failed to create job" }, { status: 500 });

  runGmailTransfer(job.id, source, dest, messages, action, user.id, plan, admin).catch(console.error);

  return NextResponse.json({ jobId: job.id });
}

async function runGmailTransfer(
  jobId: string,
  source: { access_token: string; refresh_token: string },
  dest:   { access_token: string; refresh_token: string },
  messages: { id: string; sizeEstimate?: number }[],
  action: "copy" | "move",
  userId: string,
  plan: Plan,
  admin: ReturnType<typeof createAdminClient>
) {
  let transferred = 0;
  let transferredBytes = 0;

  for (const msg of messages) {
    try {
      const raw = await getRawMessage(source.access_token, source.refresh_token, msg.id);
      await insertMessage(dest.access_token, dest.refresh_token, raw);

      if (action === "move") {
        // Trash requires gmail.modify (restricted scope). We only request
        // gmail.readonly + gmail.insert (sensitive scopes) so trash may
        // fail — log it but don't fail the job; message was already copied.
        try {
          await trashMessage(source.access_token, source.refresh_token, msg.id);
        } catch (trashErr) {
          console.warn(`Could not trash message ${msg.id} (scope may be missing):`, trashErr);
        }
      }

      transferred++;
      transferredBytes += msg.sizeEstimate ?? 0;

      await admin.from("transfer_jobs").update({
        transferred_files: transferred,
        transferred_bytes: transferredBytes,
      }).eq("id", jobId);
    } catch (err) {
      console.error(`Failed to transfer message ${msg.id}:`, err);
    }
  }

  // Update free-tier cumulative usage counter
  if (plan === "free" && transferredBytes > 0) {
    await admin.rpc("increment_email_bytes", { p_user_id: userId, p_bytes: transferredBytes });
  }

  await admin.from("transfer_jobs").update({
    status: "completed",
    completed_at: new Date().toISOString(),
  }).eq("id", jobId);
}
