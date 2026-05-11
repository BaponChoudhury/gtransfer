import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("transfer_jobs")
    .select("id, status, total_files, transferred_files, total_bytes, transferred_bytes, error_message, completed_at")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (error) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json(data);
}
