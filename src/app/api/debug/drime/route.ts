import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Pass ?token=YOUR_DRIME_TOKEN" }, { status: 400 });

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  const results: Record<string, unknown> = {};

  // Test 1: logged user
  try {
    const r = await fetch("https://app.drime.cloud/api/v1/cli/loggedUser", { headers });
    const ct = r.headers.get("content-type") ?? "";
    const body = await r.text();
    results["loggedUser"] = { status: r.status, isJson: ct.includes("application/json"), preview: body.slice(0, 300) };
  } catch (e) { results["loggedUser"] = { error: String(e) }; }

  // Test 2: list files
  try {
    const r = await fetch("https://app.drime.cloud/api/v1/drive/file-entries?workspaceId=0&perPage=3", { headers });
    const ct = r.headers.get("content-type") ?? "";
    const body = await r.text();
    results["fileEntries"] = { status: r.status, isJson: ct.includes("application/json"), preview: body.slice(0, 300) };
  } catch (e) { results["fileEntries"] = { error: String(e) }; }

  // Test 3: presign (needed for uploads)
  try {
    const r = await fetch("https://app.drime.cloud/api/v1/s3/simple/presign", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ filename: "test.txt", mime: "text/plain", size: 4, extension: "txt", workspaceId: 0 }),
    });
    const ct = r.headers.get("content-type") ?? "";
    const body = await r.text();
    results["presign"] = { status: r.status, isJson: ct.includes("application/json"), preview: body.slice(0, 300) };
  } catch (e) { results["presign"] = { error: String(e) }; }

  return NextResponse.json(results);
}
