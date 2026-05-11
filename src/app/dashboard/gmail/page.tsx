"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TransferProgress from "@/components/dashboard/TransferProgress";
import { MailIcon, RefreshCwIcon, ArrowRightIcon, PaperclipIcon } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface Account { id: string; google_email: string; }
interface Attachment { filename: string; mimeType: string; size: number; attachmentId: string; }
interface Message { id: string; subject: string; from: string; date: string; sizeEstimate: number; attachments: Attachment[]; }

export default function GmailPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [destId, setDestId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [minSizeMB, setMinSizeMB] = useState(5);
  const [action, setAction] = useState<"copy" | "move">("copy");
  const [jobId, setJobId] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);

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

  const loadMessages = useCallback(async () => {
    if (!sourceId) return;
    setLoading(true);
    setSelected(new Set());
    const params = new URLSearchParams({ accountId: sourceId, minSizeMB: String(minSizeMB) });
    const res = await fetch(`/api/gmail/messages?${params}`);
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setMessages(data.messages ?? []);
    setLoading(false);
  }, [sourceId, minSizeMB]);

  useEffect(() => { if (sourceId) loadMessages(); }, [sourceId]);

  function toggleMessage(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function selectAll() { setSelected(new Set(messages.map(m => m.id))); }
  function deselectAll() { setSelected(new Set()); }

  async function startTransfer() {
    setTransferring(true);
    const toTransfer = messages
      .filter(m => selected.has(m.id))
      .map(m => ({ id: m.id, sizeEstimate: m.sizeEstimate }));

    const res = await fetch("/api/transfer/gmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceAccountId: sourceId, destinationAccountId: destId, messages: toTransfer, action }),
    });
    if (!res.ok) { setTransferring(false); return; }
    const { jobId } = await res.json();
    setJobId(jobId);
  }

  const allSelected = messages.length > 0 && selected.size === messages.length;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gmail Large Emails</h1>
        <p className="text-gray-500 mt-1">Find emails with large attachments and copy or move them to another Gmail account — full content and context preserved.</p>
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
            <CardHeader><CardTitle className="text-base">Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Source Gmail account</label>
                  <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white" value={sourceId} onChange={e => setSourceId(e.target.value)}>
                    {accounts.map(a => <option key={a.id} value={a.id} disabled={a.id === destId}>{a.google_email}</option>)}
                  </select>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-gray-400 shrink-0 mt-5 hidden sm:block" />
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Destination Gmail account</label>
                  <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white" value={destId} onChange={e => setDestId(e.target.value)}>
                    {accounts.map(a => <option key={a.id} value={a.id} disabled={a.id === sourceId}>{a.google_email}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Min email size</label>
                  <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white" value={minSizeMB} onChange={e => setMinSizeMB(Number(e.target.value))}>
                    {[1, 2, 5, 10, 25, 50].map(n => <option key={n} value={n}>{n} MB+</option>)}
                  </select>
                </div>
                <div className="mt-4">
                  <Button size="sm" onClick={loadMessages} disabled={loading}>
                    <RefreshCwIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Search
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 font-medium">Action:</span>
                  {(["copy", "move"] as const).map(a => (
                    <label key={a} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="action" value={a} checked={action === a} onChange={() => setAction(a)} className="accent-blue-600" />
                      <span className="text-sm text-gray-700 capitalize">{a}</span>
                    </label>
                  ))}
                </div>
              </div>

              {action === "move" && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <strong>Move</strong> copies the email to the destination, then moves the original to Trash.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Emails with Large Attachments</CardTitle>
                  <CardDescription>
                    {loading ? "Searching…" : `${messages.length} email${messages.length !== 1 ? "s" : ""} found`}
                    {selected.size > 0 && ` · ${selected.size} selected`}
                  </CardDescription>
                </div>
                {!loading && messages.length > 0 && (
                  <button onClick={allSelected ? deselectAll : selectAll} className="text-xs text-blue-600 hover:underline shrink-0 mt-0.5">
                    {allSelected ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-gray-400 text-sm">Searching Gmail…</div>
              ) : messages.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">No emails found. Try a smaller size filter or click Search.</div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
                  {messages.map(msg => (
                    <label key={msg.id} className="flex items-start gap-3 py-3 px-1 hover:bg-gray-50 cursor-pointer rounded-lg">
                      <input
                        type="checkbox"
                        checked={selected.has(msg.id)}
                        onChange={() => toggleMessage(msg.id)}
                        className="mt-0.5 accent-blue-600 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900 truncate">{msg.subject}</span>
                          <Badge variant="secondary" className="text-xs shrink-0">{formatBytes(msg.sizeEstimate)}</Badge>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{msg.from} · {new Date(msg.date).toLocaleDateString()}</p>
                        {msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            {msg.attachments.map(att => (
                              <span key={att.attachmentId} className="flex items-center gap-1 text-xs text-gray-400">
                                <PaperclipIcon className="w-3 h-3" />
                                {att.filename} ({formatBytes(att.size)})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {jobId ? (
            <TransferProgress jobId={jobId} onComplete={() => { setTransferring(false); setJobId(null); setSelected(new Set()); }} />
          ) : (
            <Button className="w-full sm:w-auto" disabled={selected.size === 0 || !destId || destId === sourceId || transferring} onClick={startTransfer}>
              <MailIcon className="w-4 h-4" />
              {action === "copy" ? "Copy" : "Move"} {selected.size > 0 ? `${selected.size} email${selected.size > 1 ? "s" : ""}` : "selected emails"} →
            </Button>
          )}
        </>
      )}
    </div>
  );
}
