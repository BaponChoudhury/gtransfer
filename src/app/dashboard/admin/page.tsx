"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SaveIcon, RefreshCwIcon, CheckCircleIcon, XCircleIcon, TagIcon, ZapIcon } from "lucide-react";

interface Settings {
  essential_gbp_pence:   number;
  essential_gbp_display: string;
  essential_inr_amount:  number;
  essential_inr_display: string;
  pro_gbp_pence:         number;
  pro_gbp_display:       string;
  pro_inr_amount:        number;
  pro_inr_display:       string;
  promo_enabled:  boolean;
  promo_code:     string;
  promo_message:  string;
  promo_expiry:   string;
  promo_color:    string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function AdminPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading]   = useState(true);
  const [save, setSave]         = useState<SaveState>("idle");
  const [forbidden, setForbidden] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/pricing");
    if (res.status === 403) { setForbidden(true); setLoading(false); return; }
    const data = await res.json();
    setSettings(data as Settings);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
    setSave("idle");
  }

  async function saveSettings() {
    if (!settings) return;
    setSave("saving");
    const res = await fetch("/api/admin/pricing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSave(res.ok ? "saved" : "error");
    if (res.ok) setTimeout(() => setSave("idle"), 3000);
  }

  if (forbidden) return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-5 text-red-700 text-sm">
          Access denied. Set <code className="bg-red-100 px-1 rounded">ADMIN_EMAIL</code> in{" "}
          <code className="bg-red-100 px-1 rounded">.env.local</code> to your account email to enable this page.
        </CardContent>
      </Card>
    </div>
  );

  if (loading || !settings) return (
    <div className="py-12 text-center text-gray-400 text-sm">
      <RefreshCwIcon className="w-5 h-5 animate-spin mx-auto mb-2" />
      Loading settings…
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin — Pricing &amp; Promotions</h1>
          <p className="text-gray-500 mt-1 text-sm">Changes take effect immediately for new checkout sessions.</p>
        </div>
        <Badge variant="destructive" className="text-xs">Owner only</Badge>
      </div>

      {/* ─── GBP Prices ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">GBP Prices (international customers)</CardTitle>
          <CardDescription>Charged via Stripe. Amount in pence — £19 = 1900</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PlanPriceRow
            label="Essential Plan"
            pence={settings.essential_gbp_pence}
            display={settings.essential_gbp_display}
            onPenceChange={v => { set("essential_gbp_pence", v); set("essential_gbp_display", `£${(v / 100).toFixed(0)}`); }}
            onDisplayChange={v => set("essential_gbp_display", v)}
          />
          <PlanPriceRow
            label="Pro Plan"
            pence={settings.pro_gbp_pence}
            display={settings.pro_gbp_display}
            onPenceChange={v => { set("pro_gbp_pence", v); set("pro_gbp_display", `£${(v / 100).toFixed(0)}`); }}
            onDisplayChange={v => set("pro_gbp_display", v)}
          />
        </CardContent>
      </Card>

      {/* ─── INR Prices ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">INR Prices (India — UPI customers)</CardTitle>
          <CardDescription>Shown only to visitors with an Indian IP address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InrPriceRow
            label="Essential Plan"
            amount={settings.essential_inr_amount}
            display={settings.essential_inr_display}
            onAmountChange={v => { set("essential_inr_amount", v); set("essential_inr_display", `₹${v.toLocaleString("en-IN")}`); }}
          />
          <InrPriceRow
            label="Pro Plan"
            amount={settings.pro_inr_amount}
            display={settings.pro_inr_display}
            onAmountChange={v => { set("pro_inr_amount", v); set("pro_inr_display", `₹${v.toLocaleString("en-IN")}`); }}
          />
        </CardContent>
      </Card>

      {/* ─── Promo Banner ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TagIcon className="w-4 h-4 text-gray-500" />
            <CardTitle className="text-base">Promo Banner &amp; Discount Code</CardTitle>
          </div>
          <CardDescription>
            Create the discount first in{" "}
            <a href="https://dashboard.stripe.com/coupons" target="_blank" rel="noopener" className="text-blue-600 underline">
              Stripe → Coupons → Promotion codes
            </a>
            , then enable it here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-blue-600"
              checked={settings.promo_enabled}
              onChange={e => set("promo_enabled", e.target.checked)}
            />
            <span className="text-sm font-medium text-gray-700">Show promo banner on pricing page</span>
            <Badge variant={settings.promo_enabled ? "success" : "secondary"} className="text-xs">
              {settings.promo_enabled ? "Active" : "Hidden"}
            </Badge>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Promotion code (Stripe)">
              <input type="text" className={input} value={settings.promo_code}
                onChange={e => set("promo_code", e.target.value)} placeholder="LAUNCH20" />
            </Field>
            <Field label="Banner colour">
              <select className={input} value={settings.promo_color}
                onChange={e => set("promo_color", e.target.value)}>
                {["blue","green","amber","red"].map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Banner message (shown before the code)">
            <input type="text" className={input} value={settings.promo_message}
              onChange={e => set("promo_message", e.target.value)}
              placeholder="Launch discount — use code" />
          </Field>

          <Field label="Expiry note (optional, e.g. 'Ends Sunday')">
            <input type="text" className={input} value={settings.promo_expiry}
              onChange={e => set("promo_expiry", e.target.value)}
              placeholder="Leave blank to hide" />
          </Field>

          {settings.promo_enabled && (
            <div className={`rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap
              ${settings.promo_color === "blue"  ? "bg-blue-600 text-white" :
                settings.promo_color === "green" ? "bg-green-600 text-white" :
                settings.promo_color === "amber" ? "bg-amber-400 text-amber-950" :
                "bg-red-600 text-white"}`}>
              <ZapIcon className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium flex-1">{settings.promo_message}</span>
              <span className="font-mono font-bold text-sm px-2 py-0.5 rounded bg-white/20 border border-white/30">
                {settings.promo_code}
              </span>
              {settings.promo_expiry && <span className="text-xs opacity-75">{settings.promo_expiry}</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Save ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button onClick={saveSettings} disabled={save === "saving"} className="gap-2">
          {save === "saving" ? <RefreshCwIcon className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />}
          {save === "saving" ? "Saving…" : "Save changes"}
        </Button>
        {save === "saved" && (
          <span className="flex items-center gap-1.5 text-sm text-green-700">
            <CheckCircleIcon className="w-4 h-4" /> Saved — live immediately
          </span>
        )}
        {save === "error" && (
          <span className="flex items-center gap-1.5 text-sm text-red-700">
            <XCircleIcon className="w-4 h-4" /> Save failed — check console
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Small field helpers ──────────────────────────────────────────────────────

const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  );
}

function PlanPriceRow({ label, pence, display, onPenceChange, onDisplayChange }: {
  label: string; pence: number; display: string;
  onPenceChange: (v: number) => void; onDisplayChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
      <span className="text-sm font-medium text-gray-700 w-32 shrink-0">{label}</span>
      <div className="flex-1 space-y-1">
        <label className="text-xs text-gray-400">Amount in pence</label>
        <input type="number" className={input} value={pence} min={1}
          onChange={e => onPenceChange(Number(e.target.value))} />
      </div>
      <div className="w-28 space-y-1">
        <label className="text-xs text-gray-400">Display label</label>
        <input type="text" className={input} value={display}
          onChange={e => onDisplayChange(e.target.value)} placeholder="£19" />
      </div>
    </div>
  );
}

function InrPriceRow({ label, amount, display, onAmountChange }: {
  label: string; amount: number; display: string; onAmountChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
      <span className="text-sm font-medium text-gray-700 w-32 shrink-0">{label}</span>
      <div className="flex-1 space-y-1">
        <label className="text-xs text-gray-400">Amount (₹)</label>
        <input type="number" className={input} value={amount} min={1}
          onChange={e => onAmountChange(Number(e.target.value))} />
      </div>
      <div className="w-28 space-y-1">
        <label className="text-xs text-gray-400">Preview</label>
        <div className="text-sm font-mono px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-600">{display}</div>
      </div>
    </div>
  );
}
