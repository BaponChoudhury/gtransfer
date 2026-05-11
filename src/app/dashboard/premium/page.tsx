"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TransferProgress from "@/components/dashboard/TransferProgress";
import {
  StarIcon, HardDriveIcon, PlusIcon, Trash2Icon, RefreshCwIcon, ArrowRightIcon,
  FileIcon, FolderIcon, CheckIcon, XIcon, ExternalLinkIcon, BookmarkIcon, MailIcon, ZapIcon,
  CloudIcon, CreditCardIcon, SmartphoneIcon, CopyIcon, Loader2Icon,
} from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { FREE_EMAIL_LIMIT_BYTES, PLAN_META, type Plan } from "@/lib/plan";
import { PLAN_PRICES } from "@/lib/pricing";

interface Account       { id: string; google_email: string; role: string; }
interface ExternalAccount { id: string; provider: "mega" | "drime"; email: string; display_name: string | null; }
interface DriveFile     { id: string; name: string; mimeType: string; size?: number; }
interface ProfileData   { plan?: Plan; email_transfer_bytes?: number; }
interface DriveQuota    { limit: number | null; usage: number | null; usageInDrive: number | null; usageInDriveTrash: number | null; }

async function safeJson<T>(res: Response): Promise<T | null> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return null;
  try { return await res.json() as T; } catch { return null; }
}

// ─── Pricing data ────────────────────────────────────────────────────────────

const PLANS: {
  key: Plan;
  name: string;
  price: string;
  period: string;
  tagline: string;
  color: string;
  highlight: boolean;
  features: { label: string; included: boolean }[];
}[] = [
  {
    key: "free",
    name: "Free",
    price: "£0",
    period: "forever",
    tagline: "Try it out",
    color: "border-gray-200",
    highlight: false,
    features: [
      { label: "Gmail transfers (10 GB total limit)", included: true  },
      { label: "1 linked Google account",             included: true  },
      { label: "Drive transfers between accounts",    included: false },
      { label: "Transfer to Mega.nz (20 GB free)",    included: false },
      { label: "Transfer to Drime (20 GB free, EU)",  included: false },
      { label: "40 GB extra cloud storage total",     included: false },
    ],
  },
  {
    key: "essential",
    name: "Essential",
    price: PLAN_PRICES.essential.gbpDisplay,
    period: "one-time",
    tagline: "Best for migrating between accounts",
    color: "border-blue-400",
    highlight: false,
    features: [
      { label: "Gmail transfers — unlimited",         included: true  },
      { label: "Multiple linked Google accounts",     included: true  },
      { label: "Drive transfers between accounts",    included: true  },
      { label: "Transfer to Mega.nz (20 GB free)",    included: false },
      { label: "Transfer to Drime (20 GB free, EU)",  included: false },
      { label: "40 GB extra cloud storage total",     included: false },
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: PLAN_PRICES.pro.gbpDisplay,
    period: "one-time",
    tagline: "Everything + 40 GB extra free storage",
    color: "border-amber-400",
    highlight: true,
    features: [
      { label: "Gmail transfers — unlimited",         included: true  },
      { label: "Multiple linked Google accounts",     included: true  },
      { label: "Drive transfers between accounts",    included: true  },
      { label: "Transfer to Mega.nz (20 GB free)",    included: true  },
      { label: "Transfer to Drime (20 GB free, EU)",  included: true  },
      { label: "40 GB extra cloud storage total",     included: true  },
    ],
  },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PremiumPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-gray-400 text-sm">Loading…</div>}>
      <PremiumPageInner />
    </Suspense>
  );
}

function PremiumPageInner() {
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [googleAccounts, setGoogleAccounts] = useState<Account[]>([]);
  const [externalAccounts, setExternalAccounts] = useState<ExternalAccount[]>([]);
  const [driveQuota, setDriveQuota] = useState<DriveQuota | null>(null);
  const [sourceId, setSourceId] = useState("");
  const [externalDestId, setExternalDestId] = useState("");
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [action, setAction] = useState<"copy" | "move">("copy");
  const [jobId, setJobId] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addProvider, setAddProvider] = useState<"mega" | "drime">("mega");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [megaStep, setMegaStep] = useState<"guide" | "waiting" | "done">("guide");
  const megaWindowRef = useRef<Window | null>(null);
  const bookmarkletAnchorRef = useRef<HTMLAnchorElement>(null);

  const plan = profile?.plan ?? "free";
  const isPro = plan === "pro";

  // Set Mega bookmarklet href via DOM ref
  useEffect(() => {
    if (bookmarkletAnchorRef.current) {
      bookmarkletAnchorRef.current.setAttribute("href", getBookmarkletHref());
    }
  });

  // Auto-connect when returning from Mega bookmarklet
  useEffect(() => {
    const sid   = searchParams.get("mega_sid");
    const email = searchParams.get("mega_email") ?? "";
    const key   = searchParams.get("mega_key")   ?? "";
    const name  = searchParams.get("mega_name")  ?? "";
    const user  = searchParams.get("mega_user")  ?? "";
    if (!sid || !key) return;
    window.history.replaceState(null, "", "/dashboard/premium");
    fetch("/api/external-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "mega", email, sid, key, name, user }),
    }).then(r => safeJson<{ account: ExternalAccount }>(r)).then(data => {
      if (data?.account) setExternalAccounts(prev => {
        const updated = [...prev.filter(a => a.email !== email), data.account];
        setExternalDestId(data.account.id);
        return updated;
      });
    });
  }, []);

  // Auto-connect when returning from Drime bookmarklet
  useEffect(() => {
    const drimePassword = searchParams.get("drime_password");
    const drimeLogin    = searchParams.get("drime_login") ?? "";
    if (!drimePassword) return;
    window.history.replaceState(null, "", "/dashboard/premium");
    fetch("/api/external-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "drime", email: drimeLogin, password: drimePassword }),
    }).then(r => safeJson<{ account: ExternalAccount }>(r)).then(data => {
      if (data?.account) setExternalAccounts(prev => {
        const updated = [...prev.filter(a => a.email !== drimeLogin), data.account];
        setExternalDestId(data.account.id);
        return updated;
      });
    });
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/accounts").then(r => safeJson<{ accounts: Account[] }>(r)),
      fetch("/api/external-accounts").then(r => safeJson<{ accounts: ExternalAccount[] }>(r)),
      fetch("/api/profile").then(r => safeJson<ProfileData>(r)),
    ]).then(([accountsData, extData, prof]) => {
      const accounts = accountsData?.accounts ?? [];
      const ext = extData?.accounts ?? [];
      setGoogleAccounts(accounts);
      setExternalAccounts(ext);
      setProfile(prof ?? {});
      if (accounts.length >= 1) {
        setSourceId(accounts[0].id);
        // Fetch drive quota for the primary account to show "space to free up"
        fetch(`/api/drive/quota?accountId=${accounts[0].id}`)
          .then(r => safeJson<DriveQuota>(r))
          .then(q => { if (q) setDriveQuota(q); });
      }
      if (ext.length >= 1) setExternalDestId(ext[0].id);
    });
  }, []);

  // Plan was already updated server-side before Stripe redirected here.
  // Just re-fetch the profile to show the updated plan in the UI.
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus !== "success") return;
    window.history.replaceState(null, "", "/dashboard/premium");
    // Re-fetch profile — plan is already updated in Supabase
    fetch("/api/profile")
      .then(r => safeJson<ProfileData>(r))
      .then(prof => { if (prof) setProfile(prof); });
  }, [searchParams]);

  async function loadFiles(reset = true) {
    if (!sourceId) return;
    setLoadingFiles(true);
    const params = new URLSearchParams({ accountId: sourceId });
    const res = await fetch(`/api/drive/files?${params}`);
    const data = await safeJson<{ files: DriveFile[] }>(res);
    setFiles(prev => reset ? (data?.files ?? []) : [...prev, ...(data?.files ?? [])]);
    setLoadingFiles(false);
  }

  useEffect(() => { if (sourceId && isPro) loadFiles(true); }, [sourceId, isPro]);

  function toggleFile(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function getBookmarkletHref() {
    const returnUrl = `${window.location.origin}/dashboard/premium`;
    const code = `(function(){` +
      `if(!window.location.hostname.includes('mega.nz')){` +
        `alert('This bookmark only works on mega.nz.\\nDrag it to your bookmarks bar first, then click it while on mega.nz.');return;` +
      `}` +
      `var sid=window.u_sid||'';` +
      `var em=(window.u_attr&&window.u_attr.email)||'';` +
      `var nm=(window.u_attr&&window.u_attr.name)||'';` +
      `var uid=(window.u_attr&&window.u_attr.u)||'';` +
      `var kb='';` +
      `if(window.u_k&&window.u_k.length===4){` +
        `var b=new Uint8Array(16);` +
        `for(var i=0;i<4;i++){b[i*4]=(window.u_k[i]>>>24)&255;b[i*4+1]=(window.u_k[i]>>>16)&255;b[i*4+2]=(window.u_k[i]>>>8)&255;b[i*4+3]=window.u_k[i]&255;}` +
        `kb=btoa(String.fromCharCode.apply(null,b)).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=/g,'');` +
      `}` +
      `if(!sid||!kb){alert('Could not read Mega session. Make sure you are fully logged in and can see your files, then try again.');return;}` +
      `window.location='${returnUrl}?mega_sid='+encodeURIComponent(sid)+'&mega_email='+encodeURIComponent(em)+'&mega_key='+encodeURIComponent(kb)+'&mega_name='+encodeURIComponent(nm)+'&mega_user='+encodeURIComponent(uid);` +
    `})();`;
    return `javascript:${code}`;
  }

  async function addDrimeAccount(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");
    const res = await fetch("/api/external-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "drime", email: addEmail, password: addPassword }),
    });
    const data = await safeJson<{ account: ExternalAccount; error?: string }>(res);
    if (!res.ok) { setAddError(data?.error ?? "Connection failed"); setAddLoading(false); return; }
    if (!data?.account) { setAddLoading(false); return; }
    setExternalAccounts(prev => [...prev, data.account]);
    setExternalDestId(data.account.id);
    setShowAddForm(false);
    setAddEmail(""); setAddPassword("");
    setAddLoading(false);
  }

  async function removeExternal(id: string) {
    await fetch("/api/external-accounts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: id }) });
    setExternalAccounts(prev => prev.filter(a => a.id !== id));
  }

  async function startTransfer() {
    if (!sourceId || !externalDestId || selected.size === 0) return;
    setTransferring(true);
    const dest = externalAccounts.find(a => a.id === externalDestId)!;
    const selectedFiles = files.filter(f => selected.has(f.id));
    const res = await fetch("/api/transfer/external", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceAccountId: sourceId, externalAccountId: externalDestId, files: selectedFiles, action, provider: dest.provider }),
    });
    const data = await safeJson<{ jobId: string }>(res);
    if (data?.jobId) setJobId(data.jobId);
  }

  if (profile === null) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>;

  // ── Non-Pro: show pricing page ────────────────────────────────────────────
  if (!isPro) {
    return <PricingSection currentPlan={plan} emailUsedBytes={profile?.email_transfer_bytes ?? 0} driveQuota={driveQuota} />;
  }

  // ── Pro: show external transfer UI ───────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pro Transfers</h1>
          <p className="text-gray-500 mt-1">Transfer Google Drive files to Mega.nz or Drime.</p>
        </div>
        <Badge variant="premium">PRO</Badge>
      </div>

      {/* External accounts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">External Accounts</CardTitle>
              <CardDescription>Mega.nz and Drime accounts</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
              <PlusIcon className="w-4 h-4" />
              Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showAddForm && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
              {/* Provider tabs */}
              <div className="flex gap-2">
                {(["mega", "drime"] as const).map(p => (
                  <button key={p} type="button"
                    onClick={() => { setAddProvider(p); setMegaStep("guide"); setAddError(""); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${addProvider === p ? "bg-white border border-gray-300 shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                    {p === "mega" ? "Mega.nz" : "Drime"}
                  </button>
                ))}
              </div>

              {/* Mega flow */}
              {addProvider === "mega" && megaStep === "guide" && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 font-medium">Connect your Mega.nz account in 3 easy steps:</p>
                  <div className="flex gap-3 items-start p-3 bg-white rounded-lg border border-gray-200">
                    <Step n={1} />
                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-gray-700"><strong>Drag</strong> this button to your <strong>bookmarks bar</strong></p>
                      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                      <a ref={bookmarkletAnchorRef} onClick={e => e.preventDefault()} draggable
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-medium rounded-lg shadow cursor-grab active:cursor-grabbing select-none">
                        <BookmarkIcon className="w-3.5 h-3.5" /> Connect to Mega
                      </a>
                      <p className="text-xs text-gray-400">Press <kbd className="bg-gray-100 border border-gray-300 px-1 rounded text-xs">Ctrl+Shift+B</kbd> to show bookmarks bar.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start p-3 bg-white rounded-lg border border-gray-200">
                    <Step n={2} />
                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-gray-700">Open a new tab, go to Mega.nz, and log in</p>
                      <Button size="sm" variant="outline" onClick={() => window.open("https://mega.nz", "_blank")} type="button">
                        <ExternalLinkIcon className="w-3.5 h-3.5" /> Open Mega.nz
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <Step n={3} color="bg-orange-400" />
                    <p className="text-sm text-gray-800">Switch to that Mega.nz tab, then click <strong className="text-red-600">Connect to Mega</strong> in your bookmarks bar</p>
                  </div>
                </div>
              )}

              {addProvider === "mega" && megaStep === "waiting" && (
                <div className="text-center py-6 space-y-3">
                  <RefreshCwIcon className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                  <p className="text-sm font-medium text-gray-700">Waiting for Mega login…</p>
                  <Button size="sm" variant="ghost" onClick={() => setMegaStep("guide")}>Back</Button>
                </div>
              )}

              {/* Drime flow */}
              {addProvider === "drime" && (
                <div className="space-y-3">
                  <div className="flex gap-3 items-start p-3 bg-white rounded-lg border border-gray-200">
                    <Step n={1} />
                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-gray-700">Log into Drime → avatar → <strong>Settings → Security → Developer</strong></p>
                      <Button size="sm" variant="outline" type="button" onClick={() => window.open("https://app.drime.cloud", "_blank")}>
                        <ExternalLinkIcon className="w-3.5 h-3.5" /> Open Drime
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start p-3 bg-white rounded-lg border border-gray-200">
                    <Step n={2} />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm text-gray-700">Enter a name like <code className="bg-gray-100 px-1 rounded text-xs">GTransfer</code> and click <strong>Create new token</strong></p>
                      <p className="text-xs text-gray-400">Copy the token — it appears only once.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Step n={3} color="bg-blue-500" />
                    <form onSubmit={addDrimeAccount} className="flex-1 space-y-2">
                      <p className="text-sm font-medium text-gray-800">Paste your credentials below</p>
                      <input type="email" placeholder="Your Drime email" value={addEmail} onChange={e => setAddEmail(e.target.value)} required
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white" />
                      <input type="text" placeholder="API token (from step 2)" value={addPassword} onChange={e => setAddPassword(e.target.value)} required autoComplete="off"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white font-mono" />
                      {addError && <p className="text-xs text-red-600">{addError}</p>}
                      <Button type="submit" size="sm" disabled={addLoading} className="w-full">
                        {addLoading ? "Connecting…" : "Connect Drime"}
                      </Button>
                    </form>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button size="sm" variant="ghost" type="button" onClick={() => {
                  setShowAddForm(false); setMegaStep("guide"); setAddEmail(""); setAddPassword(""); setAddError("");
                }}>Cancel</Button>
              </div>
            </div>
          )}

          {externalAccounts.length === 0 && !showAddForm ? (
            <p className="text-sm text-gray-400 py-4 text-center">No external accounts connected.</p>
          ) : (
            externalAccounts.map(acc => (
              <div key={acc.id} className="flex items-center gap-3 p-2 rounded-lg border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold">
                  {acc.provider === "mega" ? "M" : "D"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{acc.email}</p>
                  <p className="text-xs text-gray-500">{acc.provider === "mega" ? "Mega.nz" : "Drime"}</p>
                </div>
                <button onClick={() => removeExternal(acc.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                  <Trash2Icon className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {externalAccounts.length > 0 && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Transfer Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Source (Google Drive)</label>
                  <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white" value={sourceId} onChange={e => setSourceId(e.target.value)}>
                    {googleAccounts.map(a => <option key={a.id} value={a.id}>{a.google_email}</option>)}
                  </select>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-gray-400 shrink-0 mt-6 hidden sm:block" />
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Destination</label>
                  <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white" value={externalDestId} onChange={e => setExternalDestId(e.target.value)}>
                    {externalAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.provider === "mega" ? "Mega.nz" : "Drime"} — {a.email}</option>
                    ))}
                  </select>
                </div>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Files</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => loadFiles(true)} disabled={loadingFiles}>
                  <RefreshCwIcon className={`w-4 h-4 ${loadingFiles ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingFiles ? (
                <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={selected.size === files.length && files.length > 0}
                        onChange={() => setSelected(prev => prev.size === files.length ? new Set() : new Set(files.map(f => f.id)))}
                        className="accent-blue-600" />
                      Select all
                    </label>
                    {selected.size > 0 && (
                      <span className="text-xs text-gray-500">
                        {selected.size} selected · {formatBytes(files.filter(f => selected.has(f.id)).reduce((s, f) => s + (f.size ?? 0), 0))}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {files.map(file => (
                      <label key={file.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={selected.has(file.id)} onChange={() => toggleFile(file.id)} className="accent-blue-600" />
                        {file.mimeType === "application/vnd.google-apps.folder"
                          ? <FolderIcon className="w-4 h-4 text-amber-500 shrink-0" />
                          : <FileIcon className="w-4 h-4 text-gray-400 shrink-0" />}
                        <span className="flex-1 text-sm text-gray-800 truncate">{file.name}</span>
                        {file.size && <span className="text-xs text-gray-400 shrink-0">{formatBytes(file.size)}</span>}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {jobId ? (
            <TransferProgress jobId={jobId} onComplete={() => { setTransferring(false); setJobId(null); setSelected(new Set()); }} />
          ) : (
            <Button className="w-full sm:w-auto" disabled={selected.size === 0 || !externalDestId || transferring} onClick={startTransfer}>
              <HardDriveIcon className="w-4 h-4" />
              {action === "copy" ? "Copy" : "Move"} {selected.size > 0 ? `${selected.size} file${selected.size > 1 ? "s" : ""}` : "selected"} →
            </Button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Step({ n, color = "bg-blue-100 text-blue-700" }: { n: number; color?: string }) {
  return (
    <div className={`w-6 h-6 rounded-full ${color} text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${color === "bg-blue-100 text-blue-700" ? "" : "text-white"}`}>
      {n}
    </div>
  );
}

// ─── Pricing section ─────────────────────────────────────────────────────────

interface PromoSettings {
  enabled: boolean;
  code: string;
  message: string;
  expiryLabel: string;
  color: "blue" | "green" | "amber" | "red";
}

function PromoBannerBar() {
  const [promo, setPromo]       = useState<PromoSettings | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    fetch("/api/promo")
      .then(r => r.json())
      .then(setPromo)
      .catch(() => null);
  }, []);

  if (!promo?.enabled || dismissed) return null;

  const palette = {
    blue:  { bar: "bg-blue-600",  text: "text-white",        code: "bg-white/20 text-white border-white/30", btn: "hover:bg-white/20" },
    green: { bar: "bg-green-600", text: "text-white",        code: "bg-white/20 text-white border-white/30", btn: "hover:bg-white/20" },
    amber: { bar: "bg-amber-400", text: "text-amber-950",    code: "bg-white/40 text-amber-950 border-amber-300", btn: "hover:bg-white/30" },
    red:   { bar: "bg-red-600",   text: "text-white",        code: "bg-white/20 text-white border-white/30", btn: "hover:bg-white/20" },
  }[promo.color];

  function copyCode() {
    navigator.clipboard.writeText(promo!.code).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className={`${palette.bar} ${palette.text} rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap`}>
      <ZapIcon className="w-4 h-4 shrink-0" />
      <span className="text-sm font-medium flex-1">{promo.message}</span>
      <button onClick={copyCode}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-mono text-sm font-bold tracking-wide ${palette.code} ${palette.btn} transition-colors`}>
        <CopyIcon className="w-3.5 h-3.5" />
        {copied ? "Copied!" : promo.code}
      </button>
      {promo.expiryLabel && (
        <span className="text-xs opacity-75">{promo.expiryLabel}</span>
      )}
      <button onClick={() => setDismissed(true)} className={`${palette.btn} rounded p-0.5 transition-colors`} aria-label="Dismiss">
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

interface LiveDisplayPrices {
  essential: { gbpDisplay: string; inrAmount: number; inrDisplay: string };
  pro:       { gbpDisplay: string; inrAmount: number; inrDisplay: string };
}

function PricingSection({ currentPlan, emailUsedBytes, driveQuota }: { currentPlan: Plan; emailUsedBytes: number; driveQuota: DriveQuota | null }) {
  const emailPct = Math.min(100, Math.round((emailUsedBytes / FREE_EMAIL_LIMIT_BYTES) * 100));
  const [isIndia, setIsIndia] = useState<boolean | null>(null);
  const [livePrices, setLivePrices] = useState<LiveDisplayPrices>({
    essential: { gbpDisplay: PLAN_PRICES.essential.gbpDisplay, inrAmount: PLAN_PRICES.essential.inrAmount, inrDisplay: PLAN_PRICES.essential.inrDisplay },
    pro:       { gbpDisplay: PLAN_PRICES.pro.gbpDisplay,       inrAmount: PLAN_PRICES.pro.inrAmount,       inrDisplay: PLAN_PRICES.pro.inrDisplay },
  });

  useEffect(() => {
    fetch("/api/geo")
      .then(r => r.json())
      .then(d => setIsIndia(d.country === "IN"))
      .catch(() => setIsIndia(false));
  }, []);

  useEffect(() => {
    fetch("/api/prices")
      .then(r => r.json())
      .then((d: LiveDisplayPrices) => setLivePrices(d))
      .catch(() => null);
  }, []);

  // Storage analysis for upsell
  const driveUsed   = driveQuota?.usageInDrive ?? null;
  const totalUsage  = driveQuota?.usage        ?? null;
  const totalLimit  = driveQuota?.limit        ?? null;
  const usagePct    = totalLimit && totalUsage ? Math.min(100, Math.round((totalUsage / totalLimit) * 100)) : null;
  // How much could be offloaded via Pro (Drive usage, capped at 40 GB external storage)
  const PRO_EXTERNAL_BYTES = 40 * 1024 * 1024 * 1024;
  const offloadable = driveUsed !== null ? Math.min(driveUsed, PRO_EXTERNAL_BYTES) : null;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upgrade your plan</h1>
        <p className="text-gray-500 mt-1">One-time payment — own it forever, no subscriptions.</p>
      </div>

      <PromoBannerBar />

      {/* Storage analysis — show when we have quota data */}
      {driveQuota && totalUsage !== null && (
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <CloudIcon className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-3">
                <p className="text-sm font-semibold text-gray-900">Your Google storage at a glance</p>

                {/* Usage bar */}
                {totalLimit && usagePct !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Google account usage</span>
                      <span className="text-xs text-gray-500">{formatBytes(totalUsage)} / {formatBytes(totalLimit)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${usagePct > 80 ? "bg-red-500" : usagePct > 60 ? "bg-amber-500" : "bg-blue-500"}`} style={{ width: `${usagePct}%` }} />
                    </div>
                  </div>
                )}

                {/* Offload callout */}
                {offloadable !== null && offloadable > 0 && (
                  <div className="mt-2 p-3 bg-white rounded-lg border border-green-200 flex items-center gap-3">
                    <div className="text-2xl font-extrabold text-green-600 shrink-0">{formatBytes(offloadable)}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">could be freed from Google Drive</p>
                      <p className="text-xs text-gray-500">
                        Upgrade to <strong>Pro</strong> and move up to {formatBytes(PRO_EXTERNAL_BYTES)} of Drive files to
                        Mega.nz + Drime — permanently freeing that space in your Google account.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Why one-time? */}
      <Card className="border-blue-100 bg-blue-50/40">
        <CardContent className="p-4 flex items-start gap-3">
          <ZapIcon className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">
            <strong className="text-gray-900">Why one-time pricing?</strong> GTransfer is a migration tool — most users
            transfer their data once and are done. We think it&apos;s fairer to pay once and own the features forever,
            rather than pay monthly for something you rarely use.
          </p>
        </CardContent>
      </Card>

      {/* Free plan usage bar */}
      {currentPlan === "free" && (
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MailIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Free plan email usage</span>
              <span className="text-xs text-gray-400 ml-auto">{formatBytes(emailUsedBytes)} / 10 GB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className={`h-2 rounded-full ${emailPct > 80 ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${emailPct}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((p) => {
          const isCurrent = p.key === currentPlan;
          const liveGbpDisplay = p.key !== "free" ? livePrices[p.key].gbpDisplay : null;
          const liveInrPrice   = p.key !== "free" ? { amount: livePrices[p.key].inrAmount, display: livePrices[p.key].inrDisplay } : null;
          return (
            <div
              key={p.key}
              className={`relative rounded-2xl border-2 p-6 flex flex-col ${p.highlight ? "border-amber-400 shadow-lg" : p.color} bg-white`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="premium" className="px-3 py-0.5 text-xs">Most Popular</Badge>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="secondary" className="px-3 py-0.5 text-xs">Current plan</Badge>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">{p.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{p.tagline}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-extrabold text-gray-900">{liveGbpDisplay ?? p.price}</span>
                <span className="text-sm text-gray-400 ml-2">{p.period}</span>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {p.features.map(f => (
                  <li key={f.label} className="flex items-start gap-2">
                    {f.included
                      ? <CheckIcon className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      : <XIcon    className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />}
                    <span className={`text-sm ${f.included ? "text-gray-700" : "text-gray-400"}`}>{f.label}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <Button variant="outline" disabled className="w-full">Current plan</Button>
              ) : p.key === "free" ? (
                <Button variant="outline" disabled className="w-full">Free forever</Button>
              ) : (
                <PurchaseButton
                  plan={p.key}
                  price={liveGbpDisplay ?? PLAN_META[p.key].price!}
                  inrPrice={liveInrPrice!}
                  highlight={p.highlight}
                  isIndia={isIndia ?? false}
                />
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-400">
        Questions? Email us at{" "}
        <a href="mailto:support@gtransfer.app" className="text-blue-600 hover:underline">
          support@gtransfer.app
        </a>
      </p>
    </div>
  );
}

// ─── Payment modal ────────────────────────────────────────────────────────────

type PayStep = "choose" | "upi" | "loading";

function PurchaseButton({ plan, price, inrPrice, highlight, isIndia }: {
  plan: "essential" | "pro";
  price: string;
  inrPrice: { amount: number; display: string };
  highlight: boolean;
  isIndia: boolean;
}) {
  const [step, setStep] = useState<PayStep | null>(null);
  const [copied, setCopied] = useState(false);
  const [stripeError, setStripeError] = useState("");

  const upiId   = process.env.NEXT_PUBLIC_UPI_ID   ?? "your-upi@upi";
  const upiName = process.env.NEXT_PUBLIC_UPI_NAME ?? "GTransfer";

  async function payWithStripe() {
    setStep("loading");
    setStripeError("");
    try {
      const res = await fetch("/api/payments/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setStripeError(data.error ?? "Failed to start checkout. Please try again.");
        setStep("choose");
        return;
      }
      window.location.href = data.url;
    } catch {
      setStripeError("Network error. Please try again.");
      setStep("choose");
    }
  }

  function copyUpi() {
    navigator.clipboard.writeText(upiId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Closed state:
  //   India users  → show payment method chooser (card OR UPI)
  //   Everyone else → go directly to Stripe, UPI never shown
  if (!step) {
    return (
      <Button className="w-full" variant={highlight ? "premium" : "default"}
        onClick={() => { if (isIndia) { setStep("choose"); } else { payWithStripe(); } }}>
        <StarIcon className="w-4 h-4" />
        Get {PLAN_META[plan].label} — {isIndia ? inrPrice.display : price}
      </Button>
    );
  }

  // Loading Stripe redirect
  if (step === "loading") {
    return (
      <Button className="w-full" disabled variant={highlight ? "premium" : "default"}>
        <Loader2Icon className="w-4 h-4 animate-spin" />
        Redirecting to checkout…
      </Button>
    );
  }

  // UPI details
  if (step === "upi") {
    return (
      <div className="space-y-3 p-4 bg-orange-50 border border-orange-200 rounded-xl text-sm">
        <p className="font-semibold text-gray-900 text-center">
          Pay via UPI — <span className="text-orange-600">{inrPrice.display}</span>
        </p>

        {/* QR Code */}
        <div className="flex justify-center">
          {/* Replace /upi-qr.png with your actual QR code file in the /public folder */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/upi-qr.png" alt="UPI QR Code" className="w-40 h-40 rounded-xl border border-orange-200 bg-white object-contain p-2"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        </div>

        <div className="bg-white rounded-lg border border-orange-200 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-gray-500">UPI ID</p>
              <p className="font-mono font-semibold text-gray-900 text-sm">{upiId}</p>
            </div>
            <button onClick={copyUpi} className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-medium px-2 py-1 rounded border border-orange-200 bg-white">
              <CopyIcon className="w-3 h-3" />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-orange-100">
            <span className="text-xs text-gray-500">Amount</span>
            <span className="font-bold text-gray-900">{inrPrice.display}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Pay to</span>
            <span className="text-xs font-medium text-gray-700">{upiName}</span>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center leading-relaxed">
          Scan with GPay, PhonePe, or Paytm, then email your{" "}
          <strong>UTR / transaction ID</strong> to{" "}
          <a href={`mailto:support@gtransfer.app?subject=UPI payment - ${PLAN_META[plan].label}&body=Hi, I just paid via UPI for the ${PLAN_META[plan].label} plan.%0A%0AUPI Transaction ID / UTR: %0AEmail on my account: `}
            className="text-orange-600 underline">support@gtransfer.app</a>.
          {" "}We&apos;ll activate within 24 hours.
        </p>
        <button onClick={() => setStep(isIndia ? null : "choose")} className="w-full text-xs text-gray-400 hover:text-gray-600 text-center pt-1">← Back</button>
      </div>
    );
  }

  // Choose payment method
  return (
    <div className="space-y-2">
      <p className="text-xs text-center text-gray-500 font-medium pb-1">Choose payment method</p>

      {/* Stripe / Card */}
      <button
        onClick={payWithStripe}
        className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 hover:border-blue-400 rounded-xl text-left transition-colors group"
      >
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          <CreditCardIcon className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Card / Apple Pay / Google Pay</p>
          <p className="text-xs text-gray-400">Secure checkout via Stripe · {price}</p>
        </div>
        <ArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-blue-400 shrink-0" />
      </button>

      {/* UPI */}
      <button
        onClick={() => setStep("upi")}
        className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 hover:border-orange-400 rounded-xl text-left transition-colors group"
      >
        <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
          <SmartphoneIcon className="w-4 h-4 text-orange-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">UPI <span className="text-xs font-normal text-orange-600 ml-1">India only</span></p>
          <p className="text-xs text-gray-400">GPay, PhonePe, Paytm · {inrPrice.display}</p>
        </div>
        <ArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-orange-400 shrink-0" />
      </button>

      {stripeError && <p className="text-xs text-red-600 text-center">{stripeError}</p>}
      <button onClick={() => setStep(null)} className="w-full text-xs text-gray-400 hover:text-gray-600 text-center pt-1">Cancel</button>
    </div>
  );
}
