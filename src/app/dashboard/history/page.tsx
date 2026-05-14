export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/dal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBytes, formatDate } from "@/lib/utils";
import { HistoryIcon } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  drive: "Drive → Drive",
  photos: "Photos → Photos",
  gmail_attachment: "Gmail Attachments → Drive",
  drive_to_mega: "Drive → Mega.nz",
  drive_to_drime: "Drive → Drime",
};

const STATUS_VARIANT: Record<string, "success" | "default" | "destructive" | "secondary" | "warning" | "outline"> = {
  completed: "success",
  running: "default",
  failed: "destructive",
  pending: "secondary",
  cancelled: "outline",
};

export default async function HistoryPage() {
  const user = await requireAuthUser();
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("transfer_jobs")
    .select("id, type, action, status, total_files, transferred_files, total_bytes, transferred_bytes, created_at, completed_at, error_message")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transfer History</h1>
        <p className="text-gray-500 mt-1">All your past and active transfer jobs.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          {!jobs?.length ? (
            <div className="py-12 text-center text-gray-400">
              <HistoryIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No transfers yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {jobs.map(job => {
                const pct = job.total_files > 0 ? Math.round((job.transferred_files / job.total_files) * 100) : 0;
                return (
                  <div key={job.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">{TYPE_LABELS[job.type] ?? job.type}</span>
                        <Badge variant="secondary" className="text-xs capitalize">{job.action}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(job.created_at)}</p>
                      {job.error_message && (
                        <p className="text-xs text-red-500 mt-0.5">{job.error_message}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{job.transferred_files}/{job.total_files} files</span>
                      {job.total_bytes > 0 && <span>{formatBytes(job.transferred_bytes)}</span>}
                      <span>{pct}%</span>
                    </div>

                    <Badge variant={STATUS_VARIANT[job.status] ?? "secondary"}>
                      {job.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
