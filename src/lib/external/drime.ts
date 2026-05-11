const DRIME_BASE = "https://app.drime.cloud/api/v1";

async function drimeRequest(
  apiToken: string,
  path: string,
  options: RequestInit = {}
) {
  const res = await fetch(`${DRIME_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drime API error: ${res.status} ${text}`);
  }
  return res;
}

export async function validateDrimeToken(apiToken: string): Promise<{ email: string; name: string }> {
  const res = await drimeRequest(apiToken, "/user");
  const data = await res.json();
  return { email: data.email ?? "", name: data.name ?? data.email ?? "Drime User" };
}

export async function uploadToDrime(
  apiToken: string,
  filename: string,
  stream: NodeJS.ReadableStream,
  mimeType: string,
  folderId?: string
): Promise<void> {
  const { FormData, Blob } = await import("node:buffer" as never as string).catch(() => ({
    FormData: globalThis.FormData,
    Blob: globalThis.Blob,
  }));

  // Read stream into buffer
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);

  const formData = new (globalThis.FormData)();
  formData.append("file", new (globalThis.Blob)([buffer], { type: mimeType }), filename);
  if (folderId) formData.append("folder_id", folderId);

  const res = await fetch(`${DRIME_BASE}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}` },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drime upload error: ${res.status} ${text}`);
  }
}

export async function listDrimeFiles(apiToken: string) {
  const res = await drimeRequest(apiToken, "/files");
  return res.json();
}
