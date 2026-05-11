import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { invalidatePriceCache } from "@/lib/settings";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if (!ADMIN_EMAIL || user.email !== ADMIN_EMAIL) return null;
  return user;
}

// GET /api/admin/pricing  → returns all app_settings rows as a flat key→value object
export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("app_settings").select("key, value");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const settings: Record<string, unknown> = {};
  for (const row of data ?? []) settings[row.key] = row.value;
  return NextResponse.json(settings);
}

// PATCH /api/admin/pricing  → upserts the key/value pairs sent in body
export async function PATCH(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as Record<string, unknown>;
  const admin = createAdminClient();

  const rows = Object.entries(body).map(([key, value]) => ({
    key,
    value: value as never,   // jsonb — numbers/strings/booleans all valid
    updated_at: new Date().toISOString(),
  }));

  const { error } = await admin
    .from("app_settings")
    .upsert(rows, { onConflict: "key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  invalidatePriceCache();
  return NextResponse.json({ ok: true });
}
