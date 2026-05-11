/**
 * Drime.cloud integration via their REST API (https://app.drime.cloud/api/v1).
 * Uses S3-presigned uploads to Cloudflare R2 under the hood.
 *
 * NOTE: Drime's Cloudflare WAF blocks requests from cloud-server IPs.
 * These calls must be made from a residential IP (e.g. the user's own machine
 * running the Next.js dev server, or a self-hosted deployment).
 */

const DRIME_API = "https://app.drime.cloud/api/v1";

export interface DrimeCredentials {
  email: string;
  /** Sanctum Bearer token from Drime Settings → Security → Developer */
  password: string;
  credType?: "token" | "password";
}

function authHeaders(credentials: DrimeCredentials) {
  return {
    Authorization: `Bearer ${credentials.password.trim()}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

/** Verify credentials by fetching the logged-in user. */
export async function testDrimeConnection(credentials: DrimeCredentials): Promise<boolean> {
  const res = await fetch(`${DRIME_API}/cli/loggedUser`, {
    headers: authHeaders(credentials),
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("Invalid Drime API token. Please create a new one in Settings → Security → Developer.");
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!res.ok || !ct.includes("application/json")) {
    throw new Error(
      "Could not reach Drime API. If you are running on a hosted server, Drime blocks cloud IPs — the app must be self-hosted or run locally."
    );
  }

  const data = await res.json() as { user?: { email?: string } };
  if (!data?.user) throw new Error("Unexpected response from Drime API.");
  return true;
}

/** Find an existing folder by name. Returns its id or null. */
async function findDrimeFolder(credentials: DrimeCredentials, name: string): Promise<number | null> {
  try {
    const res = await fetch(`${DRIME_API}/drive/file-entries?workspaceId=0&type=folder&perPage=50`, {
      headers: authHeaders(credentials),
    });
    if (!res.ok) return null;
    const data = await res.json() as { data?: { id: number; name: string; type?: string }[] };
    return data?.data?.find(e => e.name === name)?.id ?? null;
  } catch {
    return null;
  }
}

/** Create a folder (or find it if it already exists). Returns the folder id or null. */
export async function createDrimeFolder(
  credentials: DrimeCredentials,
  name: string,
  parentId?: number
): Promise<number | null> {
  const body: Record<string, unknown> = { name, workspaceId: 0 };
  if (parentId != null) body.parentId = parentId;

  const res = await fetch(`${DRIME_API}/folders`, {
    method: "POST",
    headers: authHeaders(credentials),
    body: JSON.stringify(body),
  });

  if (res.status === 422 || res.status === 409) {
    // Folder already exists — look it up by name so we have its ID
    return findDrimeFolder(credentials, name);
  }
  if (!res.ok) throw new Error(`Failed to create Drime folder: ${res.status}`);

  const data = await res.json() as { folder?: { id?: number }; id?: number };
  return data?.folder?.id ?? data?.id ?? null;
}

interface PresignResult {
  url: string;
  key: string; // UUID filename on R2
}

/** Get a presigned URL for a simple (<5MB) upload. */
async function presignSimple(
  credentials: DrimeCredentials,
  filename: string,
  mime: string,
  size: number
): Promise<PresignResult> {
  const ext = filename.includes(".") ? filename.split(".").pop()! : "";
  const res = await fetch(`${DRIME_API}/s3/simple/presign`, {
    method: "POST",
    headers: authHeaders(credentials),
    body: JSON.stringify({ filename, mime, size, extension: ext, workspaceId: 0 }),
  });
  if (!res.ok) throw new Error(`Drime presign failed: ${res.status}`);
  const data = await res.json() as { url: string; key?: string };
  // key is embedded in the URL path; always include the extension so /s3/entries accepts it
  let key = data.key ?? new URL(data.url).pathname.split("/").slice(-1)[0].split("?")[0];
  if (ext && !key.includes(".")) key = `${key}.${ext}`;
  return { url: data.url, key };
}

interface MultipartCreateResult {
  key: string;
  uploadId: string;
}

async function multipartCreate(
  credentials: DrimeCredentials,
  filename: string,
  mime: string,
  size: number
): Promise<MultipartCreateResult> {
  const ext = filename.includes(".") ? filename.split(".").pop()! : "";
  const res = await fetch(`${DRIME_API}/s3/multipart/create`, {
    method: "POST",
    headers: authHeaders(credentials),
    body: JSON.stringify({ filename, mime, size, extension: ext, workspaceId: 0 }),
  });
  if (!res.ok) throw new Error(`Drime multipart create failed: ${res.status}`);
  const data = await res.json() as { key: string; uploadId: string };
  // Ensure the key includes the extension
  if (ext && !data.key.includes(".")) data.key = `${data.key}.${ext}`;
  return data;
}

async function multipartSignParts(
  credentials: DrimeCredentials,
  key: string,
  uploadId: string,
  partNumbers: number[]
): Promise<Record<number, string>> {
  const res = await fetch(`${DRIME_API}/s3/multipart/batch-sign-part-urls`, {
    method: "POST",
    headers: authHeaders(credentials),
    body: JSON.stringify({ key, uploadId, partNumbers }),
  });
  if (!res.ok) throw new Error(`Drime sign parts failed: ${res.status}`);
  return await res.json() as Record<number, string>;
}

async function multipartComplete(
  credentials: DrimeCredentials,
  key: string,
  uploadId: string,
  parts: { PartNumber: number; ETag: string }[]
): Promise<void> {
  const res = await fetch(`${DRIME_API}/s3/multipart/complete`, {
    method: "POST",
    headers: authHeaders(credentials),
    body: JSON.stringify({ key, uploadId, parts }),
  });
  if (!res.ok) throw new Error(`Drime multipart complete failed: ${res.status}`);
}

/** Register a completed upload with Drime (creates the file entry). */
async function finalizeEntry(
  credentials: DrimeCredentials,
  uuidFilename: string,
  originalName: string,
  mime: string,
  size: number,
  parentId?: number
): Promise<void> {
  const ext = originalName.includes(".") ? originalName.split(".").pop()! : "bin";
  // The key from presign may be a full S3 path like "uploads/uuid1/uuid2" — Drime's /s3/entries
  // only accepts the bare filename portion (last path component), optionally with extension.
  const basename = uuidFilename.split("/").pop()!;
  const uuidWithExt = basename.includes(".") ? basename : `${basename}.${ext}`;
  const body: Record<string, unknown> = {
    filename: uuidWithExt,
    size,
    clientName: originalName,
    clientMime: mime,
    clientExtension: ext,
    workspaceId: 0,
  };
  if (parentId != null) body.parentId = parentId;

  const res = await fetch(`${DRIME_API}/s3/entries`, {
    method: "POST",
    headers: authHeaders(credentials),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Drime finalize entry failed: ${res.status} ${await res.text()}`);
}

const SIMPLE_UPLOAD_LIMIT = 5 * 1024 * 1024; // 5 MB
const PART_SIZE = 5 * 1024 * 1024;            // 5 MB per multipart chunk

/**
 * Upload a file to Drime.
 * @param credentials  Drime Bearer token credentials
 * @param filename     Original filename (e.g. "report.pdf")
 * @param content      File content as Buffer
 * @param mime         MIME type (e.g. "application/pdf")
 * @param parentId     Optional Drime folder id to upload into
 */
export async function uploadToDrime(
  credentials: DrimeCredentials,
  filename: string,
  content: Buffer,
  mime: string,
  parentId?: number
): Promise<{ success: true }> {
  const size = content.byteLength;

  if (size <= SIMPLE_UPLOAD_LIMIT) {
    // ── Simple upload ──────────────────────────────────────────────────────
    const { url, key } = await presignSimple(credentials, filename, mime, size);

    const uploadRes = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": mime },
      body: content as unknown as BodyInit,
    });
    if (!uploadRes.ok) {
      const body = await uploadRes.text().catch(() => "");
      throw new Error(`R2 upload failed: ${uploadRes.status} ${body.slice(0, 200)}`);
    }

    await finalizeEntry(credentials, key, filename, mime, size, parentId);
  } else {
    // ── Multipart upload ───────────────────────────────────────────────────
    const { key, uploadId } = await multipartCreate(credentials, filename, mime, size);

    const totalParts = Math.ceil(size / PART_SIZE);
    const partNumbers = Array.from({ length: totalParts }, (_, i) => i + 1);
    const signedUrls = await multipartSignParts(credentials, key, uploadId, partNumbers);

    const parts: { PartNumber: number; ETag: string }[] = [];
    for (let i = 0; i < totalParts; i++) {
      const start = i * PART_SIZE;
      const chunk = content.slice(start, start + PART_SIZE);
      // JSON keys are always strings; coerce to handle both "1" and 1 keyed responses
      const partUrl = (signedUrls as Record<string, string>)[String(i + 1)] ?? signedUrls[i + 1];

      const partRes = await fetch(partUrl, {
        method: "PUT",
        // No Content-Type here — R2 part presigned URLs are not signed with it,
        // so adding it causes a signature mismatch (403).
        body: chunk as unknown as BodyInit,
      });
      if (!partRes.ok) throw new Error(`R2 part ${i + 1} upload failed: ${partRes.status}`);

      const etag = partRes.headers.get("ETag") ?? `part-${i + 1}`;
      parts.push({ PartNumber: i + 1, ETag: etag });
    }

    await multipartComplete(credentials, key, uploadId, parts);
    await finalizeEntry(credentials, key, filename, mime, size, parentId);
  }

  return { success: true };
}

/** Detect Sanctum token format: "numeric_id|hex_string" */
export function isSanctumToken(value: string): boolean {
  return /^\d+\|[A-Za-z0-9]+$/.test(value.trim());
}
