"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import TransferProgress from "@/components/dashboard/TransferProgress";
import { HardDriveIcon, FileIcon, FolderIcon, RefreshCwIcon, ArrowRightIcon } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface Account { id: string; google_email: string; role: string; }
interface DriveFile { id: string; name: string; mimeType: string; size?: number; modifiedTime: string; }

export default function DrivePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [destId, setDestId] = useState("");
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [action, setAction] = useState<"copy" | "move">("copy");
  const [jobId, setJobId] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [pageToken, setPageToken] = useState<string | undefined>();

  useEffect(() => {
    fetch("/api/accounts")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const accs = data?.accounts ?? [];
        setAccounts(accs);
        if (accs.length >= 1) setSourceId(accs[0].id);
        if (accs.length >= 2) setDestId(accs[1].id);
      });
  }, []);

  const loadFiles = useCallback(async (reset = true) => {
    if (!sourceId) return;
    setLoadingFiles(true);
    const token = reset ? undefined : pageToken;
    const params = new URLSearchParams({ accountId: sourceId, ...(token ? { pageToken: token } : {}) });
    const res = await fetch(`/api/drive/files?${params}`);
    if (!res.ok) { setLoadingFiles(false); return; }
    const data = await res.json();
    setFiles(prev => reset ? (data.files ?? []) : [...prev, ...(data.files ?? [])]);
    setPageToken(data.nextPageToken);
    setLoadingFiles(false);
  }, [sourceId, pageToken]);

  useEffect(() => { if (sourceId) loadFiles(true); }, [sourceId]);

  function toggleFile(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(prev => prev.size === files.length ? new Set() : new Set(files.map(f => f.id)));
  }

  async function startTransfer() {
    if (!sourceId || !destId || selected.size === 0) return;
    setTransferring(true);
    const selectedFiles = files.filter(f => selected.has(f.id));
    const res = await fetch("/api/transfer/drive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceAccountId: sourceId, destinationAccountId: destId, files: selectedFiles, action }),
    });
    if (!res.ok) { setTransferring(false); return; }
    const { jobId } = await res.json();
    setJobId(jobId);
  }

  const totalSelectedSize = files.filter(f => selected.has(f.id)).reduce((s, f) => s + (f.size ?? 0), 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Drive Transfer</h1>
        <p className="text-gray-500 mt-1">Select files from a source account and transfer them to a destination account.</p>
      </div>

      {accounts.length < 2 ? (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 text-amber-800 text-sm">
            You need at least 2 connected Google accounts to transfer files.{" "}
            <a href="/dashboard/accounts" className="underline font-medium">Add an account →</a>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Account selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Source (from)</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                    value={sourceId}
                    onChange={e => { setSourceId(e.target.value); setSelected(new Set()); }}
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id} disabled={a.id === destId}>
                        {a.google_email} ({a.role})
                      </option>
                    ))}
                  </select>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-gray-400 shrink-0 mt-5 hidden sm:block" />
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Destination (to)</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                    value={destId}
                    onChange={e => setDestId(e.target.value)}
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id} disabled={a.id === sourceId}>
                        {a.google_email} ({a.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center gap-4 mt-4">
                <span className="text-sm text-gray-600 font-medium">Action:</span>
                {(["copy", "move"] as const).map(a => (
                  <label key={a} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="action" value={a} checked={action === a} onChange={() => setAction(a)} className="accent-blue-600" />
                    <span className="text-sm text-gray-700 capitalize">{a}</span>
                    {a === "move" && <Badge variant="warning" className="text-xs">deletes from source</Badge>}
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* File list */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Files in Source Account</CardTitle>
                  <CardDescription>Select files to transfer</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => loadFiles(true)} disabled={loadingFiles}>
                  <RefreshCwIcon className={`w-4 h-4 ${loadingFiles ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingFiles && files.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">Loading files…</div>
              ) : files.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">No files found in this account.</div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.size === files.length && files.length > 0}
                        onChange={toggleAll}
                        className="accent-blue-600"
                      />
                      Select all ({files.length} files)
                    </label>
                    {selected.size > 0 && (
                      <span className="text-xs text-gray-500">
                        {selected.size} selected · {formatBytes(totalSelectedSize)}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 max-h-72 overflow-y-auto">
                    {files.map(file => {
                      const isFolder = file.mimeType === "application/vnd.google-apps.folder";
                      return (
                        <label key={file.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected.has(file.id)}
                            onChange={() => toggleFile(file.id)}
                            className="accent-blue-600"
                          />
                          {isFolder ? (
                            <FolderIcon className="w-4 h-4 text-amber-500 shrink-0" />
                          ) : (
                            <FileIcon className="w-4 h-4 text-gray-400 shrink-0" />
                          )}
                          <span className="flex-1 text-sm text-gray-800 truncate">{file.name}</span>
                          {file.size && (
                            <span className="text-xs text-gray-400 shrink-0">{formatBytes(file.size)}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {pageToken && (
                    <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => loadFiles(false)} disabled={loadingFiles}>
                      Load more
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Transfer button + progress */}
          {jobId ? (
            <TransferProgress jobId={jobId} onComplete={() => { setTransferring(false); setJobId(null); loadFiles(true); setSelected(new Set()); }} />
          ) : (
            <Button
              className="w-full sm:w-auto"
              disabled={selected.size === 0 || !destId || destId === sourceId || transferring}
              onClick={startTransfer}
            >
              <HardDriveIcon className="w-4 h-4" />
              {action === "copy" ? "Copy" : "Move"} {selected.size > 0 ? `${selected.size} file${selected.size > 1 ? "s" : ""}` : "selected files"} →
            </Button>
          )}
        </>
      )}
    </div>
  );
}
