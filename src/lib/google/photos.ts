import { createOAuth2Client } from "./oauth";

const PHOTOS_BASE = "https://photoslibrary.googleapis.com/v1";

async function photosRequest(
  accessToken: string,
  refreshToken: string,
  path: string,
  options: { method?: string; body?: unknown } = {}
) {
  const auth = createOAuth2Client(accessToken, refreshToken);

  // Use googleapis' own request() which handles token refresh exactly like Drive does
  const response = await auth.request<unknown>({
    url: `${PHOTOS_BASE}${path}`,
    method: options.method ?? "GET",
    ...(options.body ? { data: options.body } : {}),
  });

  return response.data;
}

export interface PhotosListResponse {
  mediaItems?: Array<{ id: string; baseUrl: string; mimeType: string; filename?: string; mediaMetadata?: Record<string, unknown> }>;
  nextPageToken?: string;
}

export async function listPhotos(
  accessToken: string,
  refreshToken: string,
  pageToken?: string,
  pageSize = 50
): Promise<PhotosListResponse> {
  const params = new URLSearchParams({ pageSize: String(pageSize) });
  if (pageToken) params.set("pageToken", pageToken);
  return photosRequest(accessToken, refreshToken, `/mediaItems?${params}`) as Promise<PhotosListResponse>;
}

export async function getPhotoBytes(downloadUrl: string, accessToken: string, refreshToken: string) {
  const auth = createOAuth2Client(accessToken, refreshToken);
  // Refresh the token the same way as auth.request() does
  const { credentials } = await auth.refreshAccessToken();
  const freshToken = credentials.access_token!;

  const res = await fetch(`${downloadUrl}=d`, {
    headers: { Authorization: `Bearer ${freshToken}` },
  });
  if (!res.ok) throw new Error(`Failed to download photo: ${res.status}`);
  return res;
}

export async function uploadToPhotos(
  accessToken: string,
  refreshToken: string,
  filename: string,
  stream: ArrayBuffer
) {
  const auth = createOAuth2Client(accessToken, refreshToken);
  const { credentials } = await auth.refreshAccessToken();
  const token = credentials.access_token!;

  // Step 1: Upload bytes
  const uploadRes = await fetch(`${PHOTOS_BASE}/uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "X-Goog-Upload-File-Name": filename,
      "X-Goog-Upload-Protocol": "raw",
    },
    body: stream,
  });
  if (!uploadRes.ok) throw new Error(`Upload token error: ${uploadRes.status}`);
  const uploadToken = await uploadRes.text();

  // Step 2: Create media item
  const createRes = await fetch(`${PHOTOS_BASE}/mediaItems:batchCreate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      newMediaItems: [{ simpleMediaItem: { uploadToken, fileName: filename } }],
    }),
  });
  if (!createRes.ok) throw new Error(`Create media item error: ${createRes.status}`);
  return createRes.json();
}
