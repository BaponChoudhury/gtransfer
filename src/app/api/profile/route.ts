import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, plan, email_transfer_bytes")
    .eq("id", user.id)
    .single();

  return NextResponse.json(data ?? {});
}
