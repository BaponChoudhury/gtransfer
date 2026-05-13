import { google, drive_v3 } from "googleapis";
import { createOAuth2Client } from "./oauth";

export function getDriveClient(accessToken: string, refreshToken: string) {
  const auth = createOAuth2Client(accessToken, refreshToken);
  return google.drive({ version: "v3", auth });
}

/** Returns a fresh access token, always refreshing via the OAuth client. */
async function getFreshToken(accessToken: string, refreshToken: string): Promise<string> {
  const auth = createOAuth2Client(accessToken, refreshToken);
  // Set expiry_date to the past so getAccessToken() always refreshes rather than
  // returning a potentially-expired stored token (no expiry_date = library assumes valid).
  auth.setCredentials({ access_token: accessToken, refresh_token: refreshToken, expiry_date: 1 });
  const { token } = await auth.getAccessToken();
  if (!token) throw new Error("Could not obtain a valid access token");
  return token;
}

/** Public alias — lets callers (e.g. the transfer route) pre-fetch a token once
 *  for the entire transfer instead of refreshing on every file. */
export const getFreshAccessToken = getFreshToken;

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listDriveFiles(
  accessToken: string,
  refreshToken: string,
  options: { pageToken?: string; pageSize?: number; query?: string } = {}
) {
  const drive = getDriveClient(accessToken, refreshToken);
  const { data } = await drive.files.list({
    pageSize: options.pageSize ?? 50,
    pageToken: options.pageToken,
    q: options.query ?? "trashed=false",
    fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, parents, thumbnailLink, iconLink)",
    orderBy: "modifiedTime desc",
  });
  return data;
}

/** List all files directly inside a folder (non-recursive). */
export async function listFilesInFolder(
  accessToken: string,
  refreshToken: string,
  folderId: string
): Promise<drive_v3.Schema$File[]> {
  const drive = getDriveClient(accessToken, refreshToken);
  const allFiles: drive_v3.Schema$File[] = [];
  let pageToken: string | undefined;
  do {
    const { data } = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "nextPageToken, files(id, name, mimeType, size)",
      pageSize: 100,
      pageToken,
    });
    allFiles.push(...(data.files ?? []));
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);
  return allFiles;
}

// ─── Storage quota ────────────────────────────────────────────────────────────

export async function getDriveStorageQuota(accessToken: string, refreshToken: string) {
  const drive = getDriveClient(accessToken, refreshToken);
  const { data } = await drive.about.get({ fields: "storageQuota" });
  return data.storageQuota;
}

// ─── Download (native fetch — bypasses gaxios v7 stream issues) ──────────────

const EXPORT_FORMATS: Record<string, { mimeType: string; ext: string }> = {
  "application/vnd.google-apps.document":     { mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: ".docx" },
  "application/vnd.google-apps.spreadsheet":  { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",        ext: ".xlsx" },
  "application/vnd.google-apps.presentation": { mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", ext: ".pptx" },
  "application/vnd.google-apps.drawing":      { mimeType: "image/png",   ext: ".png"  },
  "application/vnd.google-apps.script":       { mimeType: "application/vnd.google-apps.script+json", ext: ".json" },
};

export interface DownloadResult {
  buffer: Buffer;
  effectiveMimeType: string;
  ext: string;
}

/**
 * Downloads a Drive file into a Buffer using native fetch.
 * Avoids all gaxios v7 / Web Stream compatibility issues.
 */
export async function downloadDriveFile(
  accessToken: string,
  refreshToken: string,
  fileId: string,
  mimeType?: string
): Promise<DownloadResult> {
  const token = await getFreshToken(accessToken, refreshToken);
  const exportFormat = mimeType ? EXPORT_FORMATS[mimeType] : undefined;

  let url: string;
  let effectiveMimeType: string;
  let ext: string;

  if (exportFormat) {
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportFormat.mimeType)}`;
    effectiveMimeType = exportFormat.mimeType;
    ext = exportFormat.ext;
  } else {
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
    effectiveMimeType = mimeType ?? "application/octet-stream";
    ext = "";
  }

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable)");
    throw new Error(`Drive download failed [${res.status}]: ${body.slice(0, 300)}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), effectiveMimeType, ext };
}

/**
 * Downloads a Drive file using a pre-fetched access token.
 * Skips the internal token refresh — use when you've already called getFreshAccessToken().
 */
export async function downloadDriveFileWithToken(
  token: string,
  fileId: string,
  mimeType?: string
): Promise<DownloadResult> {
  const exportFormat = mimeType ? EXPORT_FORMATS[mimeType] : undefined;

  let url: string;
  let effectiveMimeType: string;
  let ext: string;

  if (exportFormat) {
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportFormat.mimeType)}`;
    effectiveMimeType = exportFormat.mimeType;
    ext = exportFormat.ext;
  } else {
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
    effectiveMimeType = mimeType ?? "application/octet-stream";
    ext = "";
  }

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable)");
    throw new Error(`Drive download failed [${res.status}]: ${body.slice(0, 300)}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), effectiveMimeType, ext };
}

// ─── Upload (native fetch multipart — bypasses gaxios v7 issues) ─────────────

/**
 * Uploads a Buffer to Google Drive using a multipart request via native fetch.
 * Works for all file sizes and all gaxios versions.
 */
export async function uploadToDrive(
  accessToken: string,
  refreshToken: string,
  name: string,
  mimeType: string,
  content: Buffer,
  folderId?: string
): Promise<drive_v3.Schema$File> {
  const token = await getFreshToken(accessToken, refreshToken);
  const boundary = "gc_boundary_" + Math.random().toString(36).slice(2);

  const metadata = JSON.stringify({
    name,
    mimeType,
    ...(folderId ? { parents: [folderId] } : {}),
  });

  // Build multipart/related body
  const metaPart  = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`;
  const mediaPart = `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const ending    = `\r\n--${boundary}--`;

  const body = Buffer.concat([
    Buffer.from(metaPart, "utf8"),
    Buffer.from(mediaPart, "utf8"),
    content,
    Buffer.from(ending, "utf8"),
  ]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary="${boundary}"`,
        "Content-Length": String(body.length),
      },
      body,
    }
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => "(unreadable)");
    throw new Error(`Drive upload failed [${res.status}]: ${errBody.slice(0, 300)}`);
  }

  return await res.json() as drive_v3.Schema$File;
}

/**
 * Uploads a file to Drive using a pre-fetched access token.
 * Skips the internal token refresh — use when you've already called getFreshAccessToken().
 */
export async function uploadToDriveWithToken(
  token: string,
  name: string,
  mimeType: string,
  content: Buffer,
  folderId?: string
): Promise<drive_v3.Schema$File> {
  const boundary = "gc_boundary_" + Math.random().toString(36).slice(2);

  const metadata = JSON.stringify({
    name,
    mimeType,
    ...(folderId ? { parents: [folderId] } : {}),
  });

  const metaPart  = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`;
  const mediaPart = `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const ending    = `\r\n--${boundary}--`;

  const body = Buffer.concat([
    Buffer.from(metaPart, "utf8"),
    Buffer.from(mediaPart, "utf8"),
    content,
    Buffer.from(ending, "utf8"),
  ]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary="${boundary}"`,
        "Content-Length": String(body.length),
      },
      body,
    }
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => "(unreadable)");
    throw new Error(`Drive upload failed [${res.status}]: ${errBody.slice(0, 300)}`);
  }

  return await res.json() as drive_v3.Schema$File;
}

/** Creates a folder in Drive, returns its ID. */
export async function createDriveFolder(
  accessToken: string,
  refreshToken: string,
  name: string,
  parentFolderId?: string
): Promise<string> {
  const drive = getDriveClient(accessToken, refreshToken);
  const { data } = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentFolderId ? { parents: [parentFolderId] } : {}),
    },
    fields: "id",
  });
  if (!data.id) throw new Error(`Failed to create folder "${name}"`);
  return data.id;
}

/**
 * Creates a folder in Drive using a pre-fetched access token.
 * Skips the internal token refresh — use when you've already called getFreshAccessToken().
 */
export async function createDriveFolderWithToken(
  token: string,
  name: string,
  parentFolderId?: string
): Promise<string> {
  const metadata = JSON.stringify({
    name,
    mimeType: "application/vnd.google-apps.folder",
    ...(parentFolderId ? { parents: [parentFolderId] } : {}),
  });

  const res = await fetch(
    "https://www.googleapis.com/drive/v3/files?fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: metadata,
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable)");
    throw new Error(`Drive create folder failed [${res.status}]: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  if (!data.id) throw new Error(`Failed to create folder "${name}": no id returned`);
  return data.id as string;
}

/**
 * Lists all files directly inside a folder using a pre-fetched access token.
 * Skips the internal token refresh — use when you've already called getFreshAccessToken().
 */
export async function listFilesInFolderWithToken(
  token: string,
  folderId: string
): Promise<drive_v3.Schema$File[]> {
  const allFiles: drive_v3.Schema$File[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "nextPageToken, files(id, name, mimeType, size)",
      pageSize: "100",
      ...(pageToken ? { pageToken } : {}),
    });

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      throw new Error(`Drive list folder failed [${res.status}]: ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    allFiles.push(...(data.files ?? []));
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);
  return allFiles;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteDriveFile(
  accessToken: string,
  refreshToken: string,
  fileId: string
) {
  const drive = getDriveClient(accessToken, refreshToken);
  await drive.files.delete({ fileId });
}

/**
 * Deletes a Drive file using a pre-fetched access token.
 * Skips the internal token refresh — use when you've already called getFreshAccessToken().
 */
export async function deleteDriveFileWithToken(
  token: string,
  fileId: string
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  // 204 No Content = success; 404 = already gone (treat as success)
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    const body = await res.text().catch(() => "(unreadable)");
    throw new Error(`Drive delete failed [${res.status}]: ${body.slice(0, 300)}`);
  }
}
