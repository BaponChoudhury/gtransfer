import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { downloadDriveFile, listDriveFiles } from "@/lib/google/drive";
import { uploadToMega } from "@/lib/mega/client";
import { uploadToDrime, createDrimeFolder } from "@/lib/drime/client";
import { decrypt } from "@/lib/crypto";
import { Readable } from "stream";
import { planAllows, type Plan } from "@/lib/plan";
// Note: downloadDriveFile now returns { buffer, effectiveMimeType, ext }

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Require Pro plan for external (Mega / Drime) transfers
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (!planAllows(profile?.plan as Plan, "external")) {
    return NextResponse.json({ error: "Pro plan required for external storage transfers." }, { status: 403 });
  }

  const { sourceAccountId, externalAccountId, files, action, provider } = await request.json();
  const admin = createAdminClient();

  const [{ data: sourceAccount }, { data: externalAccount }] = await Promise.all([
    admin.from("connected_accounts").select("id, access_token, refresh_token").eq("id", sourceAccountId).eq("user_id", user.id).single(),
    admin.from("external_accounts").select("id, provider, email, encrypted_credentials").eq("id", externalAccountId).eq("user_id", user.id).single(),
  ]);

  if (!sourceAccount || !externalAccount) {
    return NextResponse.json({ error: "Accounts not found" }, { status: 404 });
  }

  const { data: job } = await admin.from("transfer_jobs").insert({
    user_id: user.id,
    type: provider === "mega" ? "drive_to_mega" : "drive_to_drime",
    action,
    source_account_id: sourceAccountId,
    external_account_id: externalAccountId,
    source_items: files,
    status: "running",
    total_files: files.length,
    transferred_files: 0,
    total_bytes: files.reduce((s: number, f: { size?: number }) => s + (f.size ?? 0), 0),
    transferred_bytes: 0,
  }).select().single();

  if (!job) return NextResponse.json({ error: "Failed to create job" }, { status: 500 });

  const credentials = JSON.parse(decrypt(externalAccount.encrypted_credentials));
  runExternalTransfer(job.id, sourceAccount, provider, credentials, files, action, admin).catch(console.error);

  return NextResponse.json({ jobId: job.id });
}

/** Recursively collect all downloadable files under a Drive folder. */
async function expandFolder(
  accessToken: string,
  refreshToken: string,
  folderId: string,
  folderName: string,
): Promise<{ id: string; name: string; mimeType: string; size?: number; path: string }[]> {
  const result: { id: string; name: string; mimeType: string; size?: number; path: string }[] = [];
  let pageToken: string | undefined;
  do {
    const data = await listDriveFiles(accessToken, refreshToken, {
      query: `'${folderId}' in parents and trashed=false`,
      pageSize: 100,
      pageToken,
    });
    for (const f of data.files ?? []) {
      if (f.mimeType === "application/vnd.google-apps.folder") {
        const children = await expandFolder(accessToken, refreshToken, f.id!, `${folderName}/${f.name}`);
        result.push(...children);
      } else {
        result.push({
          id: f.id!,
          name: f.name!,
          mimeType: f.mimeType!,
          size: f.size ? Number(f.size) : undefined,
          path: folderName,
        });
      }
    }
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);
  return result;
}

async function runExternalTransfer(
  jobId: string,
  source: { access_token: string; refresh_token: string },
  provider: "mega" | "drime",
  credentials: { email: string; password: string },
  files: { id: string; name: string; mimeType: string; size?: number }[],
  action: "copy" | "move",
  admin: ReturnType<typeof createAdminClient>
) {
  let transferred = 0;
  let transferredBytes = 0;
  const fileErrors: string[] = [];

  // Create root destination folder once; reuse for all uploads
  let drimeFolderId: number | null = null;
  if (provider === "drime") {
    drimeFolderId = await createDrimeFolder(credentials, "GTransfer Transfers").catch(() => null);
  }

  // Expand any folders in the selection to their individual files
  const expandedFiles: { id: string; name: string; mimeType: string; size?: number; subFolder?: string }[] = [];
  for (const file of files) {
    if (file.mimeType === "application/vnd.google-apps.folder") {
      console.log(`[Transfer] Expanding folder: ${file.name}`);
      try {
        const children = await expandFolder(source.access_token, source.refresh_token, file.id, file.name);
        for (const child of children) {
          expandedFiles.push({ ...child, subFolder: child.path });
        }
      } catch (e) {
        console.error(`[Transfer] Failed to expand folder ${file.name}:`, e);
        fileErrors.push(`${file.name}: could not list folder contents`);
      }
    } else {
      expandedFiles.push(file);
    }
  }

  // Update total count after expansion
  await admin.from("transfer_jobs").update({
    total_files: expandedFiles.length,
    total_bytes: expandedFiles.reduce((s, f) => s + (f.size ?? 0), 0),
  }).eq("id", jobId);

  for (const file of expandedFiles) {
    try {
      const { buffer, effectiveMimeType, ext } = await downloadDriveFile(
        source.access_token, source.refresh_token, file.id, file.mimeType
      );
      // For Google Workspace files (Docs/Sheets/etc.), append the export extension to the filename
      const uploadName = ext && !file.name.endsWith(ext) ? `${file.name}${ext}` : file.name;

      if (provider === "mega") {
        const readable = Readable.from(buffer);
        await uploadToMega(credentials, uploadName, readable, buffer.length, "GTransfer");
      } else {
        // Determine the sub-folder inside "GTransfer Transfers" for files from a Drive folder
        let parentId = drimeFolderId ?? undefined;
        if (file.subFolder && drimeFolderId != null) {
          const subId = await createDrimeFolder(credentials, file.subFolder, drimeFolderId).catch(() => null);
          parentId = subId ?? drimeFolderId;
        }
        await uploadToDrime(credentials, uploadName, buffer, effectiveMimeType, parentId);
      }

      transferred++;
      transferredBytes += file.size ?? 0;

      await admin.from("transfer_jobs").update({
        transferred_files: transferred,
        transferred_bytes: transferredBytes,
      }).eq("id", jobId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Transfer] Error for ${file.name}:`, msg);
      fileErrors.push(`${file.name}: ${msg}`);
      // Continue with next file instead of aborting the entire job
    }
  }

  const allFailed = transferred === 0 && fileErrors.length > 0;
  await admin.from("transfer_jobs").update({
    status: allFailed ? "failed" : "completed",
    error_message: fileErrors.length > 0 ? fileErrors.join(" | ") : null,
    completed_at: new Date().toISOString(),
  }).eq("id", jobId);
}
