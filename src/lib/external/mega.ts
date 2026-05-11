import { Storage } from "megajs";

export async function validateMegaCredentials(
  email: string,
  password: string
): Promise<{ name: string; email: string }> {
  return new Promise((resolve, reject) => {
    const storage = new Storage({ email, password, autologin: false });
    storage.login((err: Error | null) => {
      if (err) return reject(new Error(`Mega login failed: ${err.message}`));
      storage.close();
      resolve({ email, name: storage.name ?? email });
    });
  });
}

export async function uploadToMega(
  email: string,
  password: string,
  filename: string,
  stream: NodeJS.ReadableStream
): Promise<void> {
  return new Promise((resolve, reject) => {
    const storage = new Storage({ email, password, autologin: false });
    storage.login((loginErr: Error | null) => {
      if (loginErr) return reject(new Error(`Mega login failed: ${loginErr.message}`));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const upload = storage.root.upload({ name: filename }, stream as any);
      upload.on("error", (err: Error) => {
        storage.close();
        reject(new Error(`Mega upload failed: ${err.message}`));
      });
      upload.on("complete", () => {
        storage.close();
        resolve();
      });
    });
  });
}
