import { Readable } from "stream";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Storage } = require("megajs");

export interface MegaCredentials {
  email: string;
  password?: string;
  /** Session token captured from browser via bookmarklet */
  sid?: string;
  /** Master key (megajs base64url) captured from browser via bookmarklet */
  key?: string;
  /** Display name */
  name?: string;
  /** Mega user ID */
  user?: string;
}

export async function connectMega(credentials: MegaCredentials) {
  return new Promise<ReturnType<typeof Storage>>((resolve, reject) => {
    if (credentials.sid && credentials.key) {
      // Restore an existing session from browser-captured tokens.
      // Storage.fromJSON avoids any login network call (no IP-block risk).
      const storage = Storage.fromJSON({
        key: credentials.key,
        sid: credentials.sid,
        name: credentials.name ?? "",
        user: credentials.user ?? "",
        options: { email: credentials.email, keepalive: false, autoload: false, autologin: false },
      });
      // reload() loads the file tree via authenticated API call (not a new login)
      storage.reload(true, (err: Error | null) => {
        if (err) reject(err); else resolve(storage);
      });
    } else {
      // Email + password fallback
      const storage = new Storage(
        { email: credentials.email, password: credentials.password },
        (err: Error | null) => { if (err) reject(err); else resolve(storage); }
      );
    }
  });
}

export async function getMegaStorageInfo(credentials: MegaCredentials) {
  const storage = await connectMega(credentials);
  return {
    used: (storage as { bytesUsed?: number }).bytesUsed ?? 0,
    total: (storage as { bytesTotal?: number }).bytesTotal ?? 0,
    email: credentials.email,
  };
}

export async function uploadToMega(
  credentials: MegaCredentials,
  filename: string,
  stream: Readable,
  size: number,
  folderPath?: string
) {
  const storage = await connectMega(credentials);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let target: any = storage.root;

  if (folderPath) {
    const parts = folderPath.split("/").filter(Boolean);
    for (const part of parts) {
      const existing = target.children?.find((c: { name: string }) => c.name === part);
      target = existing ?? (await target.mkdir(part));
    }
  }

  // Buffer the stream so we know the exact size (required by megajs for encryption).
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  const actualSize = buffer.length;
  const bufferStream = Readable.from(buffer);

  await new Promise<void>((resolve, reject) => {
    const upload = target.upload({ name: filename, size: actualSize }, bufferStream, (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
    if (upload?.complete) {
      upload.complete.then(resolve, reject);
    }
  });
}
