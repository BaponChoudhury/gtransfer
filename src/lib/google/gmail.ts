import { google, gmail_v1 } from "googleapis";
import { createOAuth2Client } from "./oauth";

const LARGE_ATTACHMENT_THRESHOLD = 5 * 1024 * 1024; // 5 MB

export function getGmailClient(accessToken: string, refreshToken: string) {
  const auth = createOAuth2Client(accessToken, refreshToken);
  return google.gmail({ version: "v1", auth });
}

/** Recursively walks the MIME tree to find all downloadable attachments. */
function extractAttachments(
  parts: gmail_v1.Schema$MessagePart[]
): { filename: string; mimeType: string; size: number; attachmentId: string }[] {
  const result: { filename: string; mimeType: string; size: number; attachmentId: string }[] = [];
  for (const part of parts) {
    // A real attachment has both a filename and an attachmentId
    if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
      result.push({
        filename: part.filename,
        mimeType: part.mimeType ?? "application/octet-stream",
        size: part.body.size ?? 0,
        attachmentId: part.body.attachmentId,
      });
    }
    // Recurse into nested multipart/* containers
    if (part.parts?.length) {
      result.push(...extractAttachments(part.parts));
    }
  }
  return result;
}

export async function listMessagesWithLargeAttachments(
  accessToken: string,
  refreshToken: string,
  options: { pageToken?: string; minSizeBytes?: number } = {}
) {
  const gmail = getGmailClient(accessToken, refreshToken);
  const minSize = options.minSizeBytes ?? LARGE_ATTACHMENT_THRESHOLD;
  const minSizeMB = Math.floor(minSize / 1024 / 1024);

  const { data } = await gmail.users.messages.list({
    userId: "me",
    q: `has:attachment larger:${minSizeMB}m`,
    maxResults: 50,
    pageToken: options.pageToken,
  });

  if (!data.messages?.length) return { messages: [], nextPageToken: undefined };

  const messages = await Promise.all(
    data.messages.map(async (msg) => {
      // format:"full" returns the complete MIME tree including all nested parts
      const { data: full } = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "full",
      });
      const headers = full.payload?.headers ?? [];
      const get = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? null;

      const attachments = extractAttachments(full.payload?.parts ?? []);

      return {
        id: full.id,
        threadId: full.threadId,
        subject: get("Subject") ?? "(no subject)",
        from: get("From") ?? "",
        date: get("Date") ?? "",
        sizeEstimate: full.sizeEstimate ?? 0,
        attachments,
      };
    })
  );

  // Only return messages that actually have downloadable attachments
  return {
    messages: messages.filter((m) => m.attachments.length > 0),
    nextPageToken: data.nextPageToken,
  };
}

export async function downloadAttachment(
  accessToken: string,
  refreshToken: string,
  messageId: string,
  attachmentId: string
): Promise<Buffer> {
  const gmail = getGmailClient(accessToken, refreshToken);
  const { data } = await gmail.users.messages.attachments.get({
    userId: "me",
    messageId,
    id: attachmentId,
  });
  const base64 = (data.data ?? "").replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}

/** Returns the full RFC 2822 message encoded as base64url. */
export async function getRawMessage(
  accessToken: string,
  refreshToken: string,
  messageId: string
): Promise<string> {
  const gmail = getGmailClient(accessToken, refreshToken);
  const { data } = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "raw",
  });
  if (!data.raw) throw new Error(`No raw content for message ${messageId}`);
  return data.raw;
}

/** Inserts a raw message into another account's inbox (no send, preserves content). */
export async function insertMessage(
  accessToken: string,
  refreshToken: string,
  raw: string
) {
  const gmail = getGmailClient(accessToken, refreshToken);
  const { data } = await gmail.users.messages.insert({
    userId: "me",
    requestBody: { raw, labelIds: ["INBOX"] },
  });
  return data;
}

/** Moves a message to Trash (soft-delete for "move" action). */
export async function trashMessage(
  accessToken: string,
  refreshToken: string,
  messageId: string
) {
  const gmail = getGmailClient(accessToken, refreshToken);
  await gmail.users.messages.trash({ userId: "me", id: messageId });
}
