import { google } from "googleapis";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/drive",
  // gmail.modify covers list/read/insert/trash via REST API and is a
  // *sensitive* scope (shows a warning users can skip). mail.google.com
  // is a *restricted* scope that shows "Access blocked" for non-test-users.
  "https://www.googleapis.com/auth/gmail.modify",
];

export function createOAuth2Client(accessToken?: string, refreshToken?: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  );

  if (accessToken) {
    client.setCredentials({
      access_token: accessToken,
      ...(refreshToken ? { refresh_token: refreshToken } : {}),
    });
  }

  return client;
}

export function getGoogleAuthUrl(state: string, loginHint?: string) {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: GOOGLE_SCOPES,
    prompt: "consent select_account",
    state,
    ...(loginHint ? { login_hint: loginHint } : {}),
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function getGoogleUserInfo(accessToken: string) {
  const client = createOAuth2Client(accessToken);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();
  return data;
}

export async function refreshAccessToken(refreshToken: string) {
  const client = createOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return credentials;
}
