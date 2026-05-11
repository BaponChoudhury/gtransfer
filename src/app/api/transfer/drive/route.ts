import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  downloadDriveFile,
  uploadToDrive,
  deleteDriveFile,
  createDriveFolder,
  listFilesInFolder,
} from "@/lib/google/drive";
import { planAllows, type Plan } from "@/lib/plan";
import type { SupabaseClient } from "@supabase/supabase-js";

interface DriveAccount { id: string; access_token: string; refresh_token: string; google_email: string; }
interface FileItem     { id: string; name: string; mimeType: string; size?: number; }

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (!planAllows(profile?.plan as Plan, "drive")) {
    return NextResponse.json({ error: "Essential plan required for Drive transfers." }, { status: 403 });
  }

  const { sourceAccountId, destinationAccountId, files, action } = await request.json();

  const admin = createAdminClient();
  const { data: accounts, error: acctErr } = await admin
    .from("connected_accounts")
    .select("id, access_token, refresh_token, google_email")
    .in("id", [sourceAccountId, destinationAccountId])
    .eq("user_id", user.id);

  if (acctErr || !accounts || accounts.length < 2) {
    return NextResponse.json({ error: "Accounts not found" }, { status: 404 });
  }

  const source = accounts.find((a) => a.id === sourceAccountId)!;
  const dest   = accounts.find((a) => a.id === destinationAccountId)!;

  // Count total items including recursive folder contents
  const totalFiles = files.length;

  const { data: job, error: jobErr } = await admin.from("transfer_jobs").insert({
    user_id: user.id,
    type: "drive",
    action,
    source_account_id: sourceAccountId,
    destination_account_id: destinationAccountId,
    source_items: files,
    status: "running",
    total_files: totalFiles,
    transferred_files: 0,
    total_bytes: files.reduce((s: number, f: FileItem) => s + (f.size ?? 0), 0),
    transferred_bytes: 0,
  }).select().single();

  if (jobErr || !job) return NextResponse.json({ error: "Failed to create job" }, { status: 500 });

  // Run transfer in background
  runDriveTransfer(job.id, source, dest, files, action, admin).catch(async (err) => {
    console.error("Drive transfer fatal error:", err);
    await admin.from("transfer_jobs").update({
      status: "failed",
      error_message: err instanceof Error ? err.message : String(err),
    }).eq("id", job.id);
  });

  return NextResponse.json({ jobId: job.id });
}

// ─── Transfer runner ──────────────────────────────────────────────────────────

interface TransferState {
  transferred: number;
  transferredBytes: number;
  failed: number;
  failedNames: string[];
  totalFiles: number; // tracked here so folder recursion can expand it accurately
}

async function runDriveTransfer(
  jobId: string,
  source: DriveAccount,
  dest: DriveAccount,
  items: FileItem[],
  action: "copy" | "move",
  admin: SupabaseClient
) {
  const state: TransferState = { transferred: 0, transferredBytes: 0, failed: 0, failedNames: [], totalFiles: items.length };

  for (const item of items) {
    await transferItem(item, undefined, source, dest, action, state, jobId, admin);
  }

  const finalStatus = state.failed === 0 ? "completed"
    : state.transferred === 0 ? "failed"
    : "completed"; // partial success still completes

  await admin.from("transfer_jobs").update({
    status: finalStatus,
    transferred_files: state.transferred,
    transferred_bytes: state.transferredBytes,
    completed_at: new Date().toISOString(),
    ...(state.failed > 0 ? {
      error_message: `${state.failed} file(s) failed: ${state.failedNames.slice(0, 5).join(", ")}${state.failedNames.length > 5 ? "…" : ""}`,
    } : {}),
  }).eq("id", jobId);
}

/**
 * Recursively transfers a single item (file or folder).
 * For folders: creates matching folder in destination, then recurses into contents.
 */
async function transferItem(
  item: FileItem,
  destParentFolderId: string | undefined,
  source: DriveAccount,
  dest: DriveAccount,
  action: "copy" | "move",
  state: TransferState,
  jobId: string,
  admin: SupabaseClient
) {
  const FOLDER_MIME = "application/vnd.google-apps.folder";

  if (item.mimeType === FOLDER_MIME) {
    // ── Folder: create in destination then recurse ────────────────────────────
    let newFolderId: string;
    try {
      newFolderId = await createDriveFolder(dest.access_token, dest.refresh_token, item.name, destParentFolderId);
    } catch (err) {
      console.error(`Failed to create folder "${item.name}":`, err);
      state.failed++;
      state.failedNames.push(item.name + "/");
      return;
    }

    // List children and recurse
    let children: FileItem[];
    try {
      const raw = await listFilesInFolder(source.access_token, source.refresh_token, item.id);
      children = raw.map(f => ({
        id: f.id!,
        name: f.name!,
        mimeType: f.mimeType!,
        size: f.size ? Number(f.size) : undefined,
      }));
    } catch (err) {
      console.error(`Failed to list folder contents "${item.name}":`, err);
      state.failed++;
      state.failedNames.push(item.name + "/");
      return;
    }

    // Expand total: folder itself isn't a file, replace its slot with its children
    state.totalFiles = state.totalFiles - 1 + children.length;
    await admin.from("transfer_jobs")
      .update({ total_files: state.totalFiles })
      .eq("id", jobId);

    for (const child of children) {
      await transferItem(child, newFolderId, source, dest, action, state, jobId, admin);
    }

    // "Move" folder: delete original after all contents transferred
    if (action === "move") {
      try { await deleteDriveFile(source.access_token, source.refresh_token, item.id); }
      catch (err) { console.error(`Failed to delete source folder "${item.name}":`, err); }
    }
  } else {
    // ── Regular file ──────────────────────────────────────────────────────────
    try {
      const { buffer, effectiveMimeType, ext } = await downloadDriveFile(
        source.access_token, source.refresh_token, item.id, item.mimeType
      );

      const destName = ext && !item.name.endsWith(ext) ? `${item.name}${ext}` : item.name;

      await uploadToDrive(
        dest.access_token, dest.refresh_token,
        destName, effectiveMimeType, buffer,
        destParentFolderId
      );

      if (action === "move") {
        await deleteDriveFile(source.access_token, source.refresh_token, item.id);
      }

      state.transferred++;
      state.transferredBytes += item.size ?? buffer.length;

      await admin.from("transfer_jobs").update({
        transferred_files: state.transferred,
        transferred_bytes: state.transferredBytes,
      }).eq("id", jobId);

    } catch (err) {
      console.error(`Failed to transfer "${item.name}":`, err instanceof Error ? err.message : err);
      state.failed++;
      state.failedNames.push(item.name);
    }
  }
}
