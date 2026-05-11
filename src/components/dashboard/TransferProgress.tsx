"use client";

import { useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircleIcon, XCircleIcon, LoaderIcon } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface JobStatus {
  id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  total_files: number;
  transferred_files: number;
  total_bytes: number;
  transferred_bytes: number;
  error_message: string | null;
  completed_at: string | null;
}

export default function TransferProgress({ jobId, onComplete }: { jobId: string; onComplete?: () => void }) {
  const [job, setJob] = useState<JobStatus | null>(null);
  // Keep onComplete in a ref so the polling loop never needs to restart when the
  // parent re-renders (inline arrow functions change reference on every render).
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    async function poll() {
      while (!cancelled) {
        try {
          const res = await fetch(`/api/transfer/status/${jobId}`);
          if (res.ok) {
            const data: JobStatus = await res.json();
            setJob(data);
            if (data.status === "completed" || data.status === "failed" || data.status === "cancelled") {
              return; // stop polling — user dismisses via button
            }
          }
        } catch {
          // network hiccup — just retry
        }
        await new Promise<void>(r => setTimeout(r, 1500));
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [jobId]);

  if (!job) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <LoaderIcon className="w-4 h-4 animate-spin" />
        Starting transfer…
      </div>
    );
  }

  const pct = job.total_files > 0 ? Math.round((job.transferred_files / job.total_files) * 100) : 0;
  const isDone = job.status === "completed" || job.status === "failed" || job.status === "cancelled";

  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          {job.status === "completed" ? "Transfer complete" :
           job.status === "failed"    ? "Transfer failed"   :
           "Transferring…"}
        </span>
        <Badge variant={
          job.status === "completed" ? "success" :
          job.status === "failed"    ? "destructive" :
          "default"
        }>
          {job.status}
        </Badge>
      </div>

      {/* Progress bar */}
      <Progress value={pct} />

      {/* Counts */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{job.transferred_files} / {job.total_files} file{job.total_files !== 1 ? "s" : ""}</span>
        {job.total_bytes > 0 && (
          <span>{formatBytes(job.transferred_bytes)} / {formatBytes(job.total_bytes)}</span>
        )}
        <span>{pct}%</span>
      </div>

      {/* Result + dismiss button */}
      {isDone && (
        <div className="flex items-center justify-between gap-3 pt-1">
          {job.status === "completed" ? (
            <div className="flex items-center gap-1.5 text-sm text-green-700">
              <CheckCircleIcon className="w-4 h-4 shrink-0" />
              All files transferred successfully.
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-sm text-red-700">
              <XCircleIcon className="w-4 h-4 shrink-0" />
              {job.error_message ?? "Transfer failed."}
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => onCompleteRef.current?.()}
          >
            {job.status === "completed" ? "Transfer More" : "Try Again"}
          </Button>
        </div>
      )}
    </div>
  );
}
