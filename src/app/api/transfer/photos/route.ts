import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPhotoBytes, uploadToPhotos } from "@/lib/google/photos";
import { planAllows, type Plan } from "@/lib/plan";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Require Essential or Pro plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (!planAllows(profile?.plan as Plan, "photos")) {
    return NextResponse.json({ error: "Essential plan required for Photos transfers." }, { status: 403 });
  }

  const { sourceAccountId, destinationAccountId, photos, action } = await request.json();
  const admin = createAdminClient();

  const { data: accounts, error: acctErr } = await admin
    .from("connected_accounts")
    .select("id, access_token, refresh_token")
    .in("id", [sourceAccountId, destinationAccountId])
    .eq("user_id", user.id);

  if (acctErr || !accounts || accounts.length < 2) {
    return NextResponse.json({ error: "Accounts not found" }, { status: 404 });
  }

  const source = accounts.find((a) => a.id === sourceAccountId)!;
  const dest = accounts.find((a) => a.id === destinationAccountId)!;

  const { data: job } = await admin.from("transfer_jobs").insert({
    user_id: user.id,
    type: "photos",
    action,
    source_account_id: sourceAccountId,
    destination_account_id: destinationAccountId,
    source_items: photos,
    status: "running",
    total_files: photos.length,
    transferred_files: 0,
    total_bytes: 0,
    transferred_bytes: 0,
  }).select().single();

  if (!job) return NextResponse.json({ error: "Failed to create job" }, { status: 500 });

  runPhotosTransfer(job.id, source, dest, photos, admin).catch(console.error);

  return NextResponse.json({ jobId: job.id });
}

async function runPhotosTransfer(
  jobId: string,
  source: { access_token: string; refresh_token: string },
  dest: { access_token: string; refresh_token: string },
  photos: { id: string; filename: string; baseUrl: string }[],
  admin: ReturnType<typeof createAdminClient>
) {
  let transferred = 0;

  for (const photo of photos) {
    try {
      const res = await getPhotoBytes(photo.baseUrl, source.access_token, source.refresh_token);
      const buffer = await res.arrayBuffer();
      await uploadToPhotos(dest.access_token, dest.refresh_token, photo.filename, buffer);

      transferred++;
      await admin.from("transfer_jobs").update({ transferred_files: transferred }).eq("id", jobId);
    } catch (err) {
      console.error(`Failed to transfer photo ${photo.filename}:`, err);
    }
  }

  await admin.from("transfer_jobs").update({
    status: "completed",
    completed_at: new Date().toISOString(),
  }).eq("id", jobId);
}
