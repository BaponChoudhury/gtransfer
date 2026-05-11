"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TransferProgress from "@/components/dashboard/TransferProgress";
import { ImageIcon, RefreshCwIcon, ArrowRightIcon, CheckIcon, LockIcon } from "lucide-react";

const PHOTOS_API_RESTRICTED = true; // Google Photos Library API requires project approval

interface Account { id: string; google_email: string; role: string; }
interface Photo { id: string; filename: string; baseUrl: string; mediaMetadata?: { width: string; height: string; creationTime: string }; }

export default function PhotosPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [destId, setDestId] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [scopeError, setScopeError] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
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

  const loadPhotos = useCallback(async (reset = true) => {
    if (!sourceId) return;
    setLoading(true);
    setScopeError(false);
    setErrorDetail(null);
    const token = reset ? undefined : pageToken;
    const params = new URLSearchParams({ accountId: sourceId, ...(token ? { pageToken: token } : {}) });
    const res = await fetch(`/api/photos/list?${params}`);
    const ct = res.headers.get("content-type") ?? "";
    const data = ct.includes("application/json") ? await res.json() : null;
    if (!res.ok) {
      setScopeError(data?.scopeError ?? true);
      setErrorDetail(data?.detail ?? null);
      setPhotos([]);
    } else {
      setPhotos(prev => reset ? (data?.photos ?? []) : [...prev, ...(data?.photos ?? [])]);
      setPageToken(data?.nextPageToken);
    }
    setLoading(false);
  }, [sourceId, pageToken]);

  useEffect(() => { if (sourceId) loadPhotos(true); }, [sourceId]);

  function togglePhoto(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleAll() {
    setSelected(prev => prev.size === photos.length ? new Set() : new Set(photos.map(p => p.id)));
  }

  async function startTransfer() {
    setTransferring(true);
    const selectedPhotos = photos.filter(p => selected.has(p.id));
    const res = await fetch("/api/transfer/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceAccountId: sourceId, destinationAccountId: destId, photos: selectedPhotos, action }),
    });
    if (!res.ok) { setTransferring(false); return; }
    const { jobId } = await res.json();
    setJobId(jobId);
  }

  if (PHOTOS_API_RESTRICTED) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Photos Transfer</h1>
          <p className="text-gray-500 mt-1">Copy or move photos between Google Photos libraries.</p>
        </div>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6 flex gap-4">
            <LockIcon className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-semibold text-amber-900">Google Photos API requires project approval</p>
              <p className="text-sm text-amber-800">
                Google has restricted the Photos Library API to approved projects only. Your token has the correct
                scopes and the API is enabled, but Google requires an additional project-level review before
                photo data is served.
              </p>
              <p className="text-sm text-amber-800">To request access:</p>
              <ol className="text-sm text-amber-800 list-decimal list-inside space-y-1">
                <li>
                  Go to{" "}
                  <a
                    href="https://console.cloud.google.com/apis/library/photoslibrary.googleapis.com"
                    target="_blank"
                    className="underline font-medium"
                  >
                    Google Cloud Console → Photos Library API
                  </a>
                </li>
                <li>Look for an &ldquo;Apply for access&rdquo; button or usage policy form</li>
                <li>Submit the form — Google reviews these within a few days to weeks</li>
                <li>Once approved, remove the <code className="bg-amber-100 px-1 rounded">PHOTOS_API_RESTRICTED</code> flag from the code</li>
              </ol>
              <p className="text-sm text-amber-700 mt-2">
                In the meantime, <a href="/dashboard/drive" className="underline font-medium">Drive</a> and{" "}
                <a href="/dashboard/gmail" className="underline font-medium">Gmail</a> transfers work fully.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Photos Transfer</h1>
        <p className="text-gray-500 mt-1">Copy or move photos between Google Photos libraries.</p>
      </div>

      {accounts.length < 2 ? (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 text-amber-800 text-sm">
            You need at least 2 connected accounts.{" "}
            <a href="/dashboard/accounts" className="underline font-medium">Add an account →</a>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Select Accounts</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Source (from)</label>
                  <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white" value={sourceId} onChange={e => { setSourceId(e.target.value); setSelected(new Set()); }}>
                    {accounts.map(a => <option key={a.id} value={a.id} disabled={a.id === destId}>{a.google_email}</option>)}
                  </select>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-gray-400 shrink-0 mt-5 hidden sm:block" />
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Destination (to)</label>
                  <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white" value={destId} onChange={e => setDestId(e.target.value)}>
                    {accounts.map(a => <option key={a.id} value={a.id} disabled={a.id === sourceId}>{a.google_email}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <span className="text-sm text-gray-600 font-medium">Action:</span>
                {(["copy", "move"] as const).map(a => (
                  <label key={a} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="action" value={a} checked={action === a} onChange={() => setAction(a)} className="accent-blue-600" />
                    <span className="text-sm text-gray-700 capitalize">{a}</span>
                  </label>
                ))}
              </div>
              {action === "move" && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <strong>Note:</strong> Google Photos does not allow apps to delete photos via its API. &ldquo;Move&rdquo; will copy the photos to the destination — you&apos;ll need to delete them from the source manually afterwards.
                </p>
              )}
            </CardContent>
          </Card>

          {scopeError && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 text-sm text-red-800 space-y-2">
                <p className="font-semibold">Google Photos access not granted for this account.</p>
                {errorDetail && <p className="text-xs font-mono bg-red-100 rounded p-2 break-all">{errorDetail}</p>}
                <p>To fix this:</p>
                <ol className="list-decimal list-inside space-y-1 text-red-700">
                  <li>Go to <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" className="underline font-medium">Google Cloud Console → OAuth consent screen</a></li>
                  <li>Click <strong>Edit App</strong> → <strong>Scopes</strong> → <strong>Add or remove scopes</strong></li>
                  <li>Add <code className="bg-red-100 px-1 rounded">https://www.googleapis.com/auth/photoslibrary</code></li>
                  <li>Save, then go to <a href="/dashboard/accounts" className="underline font-medium">Accounts</a>, disconnect <strong>all accounts</strong> and reconnect them</li>
                </ol>
              </CardContent>
            </Card>
          )}
          {!scopeError && errorDetail && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 text-sm text-red-800 space-y-2">
                <p className="font-semibold">Failed to load photos.</p>
                <p className="text-xs font-mono bg-red-100 rounded p-2 break-all">{errorDetail}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Photos</CardTitle>
                  <CardDescription>Select photos to transfer</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => loadPhotos(true)} disabled={loading}>
                  <RefreshCwIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading && photos.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">Loading photos…</div>
              ) : photos.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">No photos found.</div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={selected.size === photos.length} onChange={toggleAll} className="accent-blue-600" />
                      Select all ({photos.length})
                    </label>
                    {selected.size > 0 && <span className="text-xs text-gray-500">{selected.size} selected</span>}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-72 overflow-y-auto">
                    {photos.map(photo => (
                      <div
                        key={photo.id}
                        className={`relative cursor-pointer rounded-lg overflow-hidden aspect-square border-2 transition-colors ${selected.has(photo.id) ? "border-blue-500" : "border-transparent"}`}
                        onClick={() => togglePhoto(photo.id)}
                      >
                        <img src={`${photo.baseUrl}=w120-h120-c`} alt={photo.filename} className="w-full h-full object-cover" />
                        {selected.has(photo.id) && (
                          <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                            <div className="bg-blue-600 rounded-full p-0.5">
                              <CheckIcon className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {pageToken && (
                    <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => loadPhotos(false)} disabled={loading}>
                      Load more
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {jobId ? (
            <TransferProgress jobId={jobId} onComplete={() => { setTransferring(false); setJobId(null); setSelected(new Set()); }} />
          ) : (
            <Button className="w-full sm:w-auto" disabled={selected.size === 0 || !destId || destId === sourceId || transferring} onClick={startTransfer}>
              <ImageIcon className="w-4 h-4" />
              {action === "copy" ? "Copy" : "Move"} {selected.size > 0 ? `${selected.size} photo${selected.size > 1 ? "s" : ""}` : "selected photos"} →
            </Button>
          )}
        </>
      )}
    </div>
  );
}
