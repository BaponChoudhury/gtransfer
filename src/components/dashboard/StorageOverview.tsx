"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardDriveIcon, MailIcon, ImageIcon } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface AccountQuota {
  id: string;
  google_email: string;
  role: string;
  limit: number;
  usage: number;
  usageInDrive: number;
}

interface SavingEntry {
  accountId: string;
  drive: number;
  gmail: number;
  photos: number;
  total: number;
}

interface Totals {
  drive: number;
  gmail: number;
  photos: number;
  files: number;
}

interface Stats {
  accounts: AccountQuota[];
  savings: SavingEntry[];
  totals: Totals;
}

function StorageBar({
  used,
  saved,
  limit,
}: {
  used: number;
  saved: number;
  limit: number;
}) {
  if (!limit) return <p className="text-xs text-gray-400">Quota unavailable</p>;

  const usedPct   = Math.min((used / limit) * 100, 100);
  const savedPct  = Math.min((saved / limit) * 100, usedPct);
  const afterPct  = Math.max(usedPct - savedPct, 0);

  const color =
    usedPct > 90 ? "bg-red-500" :
    usedPct > 75 ? "bg-amber-500" :
    "bg-blue-500";

  return (
    <div className="space-y-1.5">
      {/* Current usage bar */}
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all ${color}`}
          style={{ width: `${usedPct}%` }}
        />
        {saved > 0 && (
          <div
            className="absolute top-0 h-full rounded-full bg-green-400/70"
            style={{ left: `${afterPct}%`, width: `${savedPct}%` }}
          />
        )}
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {formatBytes(used)} used
          {saved > 0 && (
            <span className="text-green-600 font-medium ml-1">
              (−{formatBytes(saved)} freed)
            </span>
          )}
        </span>
        <span>{formatBytes(limit)} total</span>
      </div>

      {/* After-move projection */}
      {saved > 0 && (
        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-green-500 rounded-full"
            style={{ width: `${afterPct}%` }}
          />
        </div>
      )}
      {saved > 0 && (
        <p className="text-xs text-green-600">
          After moves: {formatBytes(used - saved)} used ({Math.round(afterPct)}%)
        </p>
      )}
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-16 text-right shrink-0">{formatBytes(value)}</span>
    </div>
  );
}

export default function StorageOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/storage/stats")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Storage Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="space-y-1.5 animate-pulse">
                <div className="h-3 bg-gray-200 rounded-full w-3/4" />
                <div className="h-3 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats?.accounts?.length) return null;

  const totalSaved  = stats.savings.reduce((s, e) => s + e.total, 0);
  const totalMoved  = stats.totals.drive + stats.totals.gmail + stats.totals.photos;
  const maxCategory = Math.max(stats.totals.drive, stats.totals.gmail, stats.totals.photos, 1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Storage Overview</CardTitle>
          {totalSaved > 0 && (
            <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
              {formatBytes(totalSaved)} freed by moves
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Per-account storage bars */}
        <div className="space-y-5">
          {stats.accounts.map(acc => {
            const saving = stats.savings.find(s => s.accountId === acc.id);
            return (
              <div key={acc.id}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-sm font-medium text-gray-800 truncate">{acc.google_email}</span>
                  <span className="text-xs text-gray-400 capitalize shrink-0">({acc.role})</span>
                </div>
                <StorageBar
                  used={acc.usage}
                  saved={saving?.total ?? 0}
                  limit={acc.limit}
                />
              </div>
            );
          })}
        </div>

        {/* Divider */}
        {totalMoved > 0 && <div className="border-t border-gray-100" />}

        {/* Transferred breakdown */}
        {totalMoved > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Transferred ({formatBytes(totalMoved)} total · {stats.totals.files} files)
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <HardDriveIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-xs text-gray-600 w-14 shrink-0">Drive</span>
                <MiniBar value={stats.totals.drive} max={maxCategory} color="bg-blue-400" />
              </div>
              <div className="flex items-center gap-2">
                <MailIcon className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="text-xs text-gray-600 w-14 shrink-0">Gmail</span>
                <MiniBar value={stats.totals.gmail} max={maxCategory} color="bg-red-400" />
              </div>
              <div className="flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-green-500 shrink-0" />
                <span className="text-xs text-gray-600 w-14 shrink-0">Photos</span>
                <MiniBar value={stats.totals.photos} max={maxCategory} color="bg-green-400" />
              </div>
            </div>
          </div>
        )}

        {/* Zero-state hint */}
        {totalMoved === 0 && totalSaved === 0 && (
          <p className="text-xs text-gray-400 text-center py-1">
            Complete a transfer to see space savings here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
