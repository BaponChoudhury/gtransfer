import { NextRequest, NextResponse } from "next/server";

const DRIME_BASE = "https://app.drime.cloud";

// Nextcloud Login Flow v2 — try both URL patterns (some instances omit index.php)
const LOGIN_V2_URLS = [
  `${DRIME_BASE}/index.php/login/v2`,
  `${DRIME_BASE}/login/v2`,
];

/** POST — initiate Login Flow v2, returns { loginUrl, pollToken, pollEndpoint } */
export async function POST() {
  let lastStatus = 0;
  let lastBody = "";

  for (const url of LOGIN_V2_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "User-Agent": "GoogleConnect/1.0",
          "OCS-APIREQUEST": "true",
        },
      });

      lastStatus = res.status;
      const ct = res.headers.get("content-type") ?? "";

      if (!res.ok) {
        lastBody = await res.text().catch(() => "");
        continue; // try next URL
      }

      if (!ct.includes("application/json")) {
        lastBody = await res.text().catch(() => "");
        continue;
      }

      const data = await res.json() as {
        poll: { token: string; endpoint: string };
        login: string;
      };

      if (!data?.login || !data?.poll?.token || !data?.poll?.endpoint) {
        lastBody = JSON.stringify(data);
        continue;
      }

      return NextResponse.json({
        loginUrl: data.login,
        pollToken: data.poll.token,
        pollEndpoint: data.poll.endpoint,
      });
    } catch (e) {
      lastBody = String(e);
    }
  }

  return NextResponse.json(
    { error: `Drime Login Flow v2 failed (status ${lastStatus}): ${lastBody.slice(0, 200)}` },
    { status: 502 }
  );
}

/** GET ?token=...&endpoint=... — poll for credentials */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const endpoint = req.nextUrl.searchParams.get("endpoint");
  if (!token || !endpoint) {
    return NextResponse.json({ error: "Missing token or endpoint" }, { status: 400 });
  }
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "GoogleConnect/1.0",
      },
      body: new URLSearchParams({ token }),
    });
    if (res.status === 404) {
      // Still waiting — user hasn't logged in yet
      return NextResponse.json({ done: false });
    }
    if (!res.ok) {
      return NextResponse.json({ done: false, error: `Poll returned ${res.status}` });
    }
    const creds = await res.json() as {
      server: string;
      loginName: string;
      appPassword: string;
    };
    return NextResponse.json({
      done: true,
      email: creds.loginName,
      password: creds.appPassword,
    });
  } catch (e) {
    return NextResponse.json({ done: false, error: String(e) });
  }
}
