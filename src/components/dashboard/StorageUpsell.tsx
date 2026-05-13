"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HardDriveIcon, MailIcon, ArrowRightIcon } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface DriveQuota {
  limit: number;
  usage: number;
  usageInDrive: number;
  usageInDriveTrash: number;
}

interface Props {
  plan: "free" | "essential" | "pro";
  primaryAccountId: string | null;
  emailUsedBytes: number;
}

export default function StorageUpsell({ plan, primaryAccountId, emailUsedBytes }: Props) {
  const [quota, setQuota] = useState<DriveQuota | null>(null);

  useEffect(() => {
    if (!primaryAccountId) return;
    fetch(`/api/drive/quota?accountId=${primaryAccountId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setQuota(d); })
      .catch(() => null);
  }, [primaryAccountId]);

  // Only show upsell if we have quota data and there's something useful to say
  if (!quota || !quota.limit) return null;

  const driveUsed     = quota.usageInDrive ?? 0;
  const totalUsed     = quota.usage ?? 0;
  const limit         = quota.limit;
  const usagePct      = Math.round((totalUsed / limit) * 100);

  // Only show if storage is meaningful (>100 MB used) or email quota is meaningful
  if (totalUsed < 100 * 1024 * 1024 && emailUsedBytes < 100 * 1024 * 1024) return null;

  const barColor = usagePct > 85 ? "bg-red-500" : usagePct > 65 ? "bg-amber-500" : "bg-blue-500";

  return (
    <Card className={`border-2 ${usagePct > 85 ? "border-red-200 bg-red-50/30" : "border-blue-100 bg-blue-50/30"}`}>
      <CardContent className="p-5 space-y-4">

        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg shrink-0">
            <HardDriveIcon className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Your Google storage at a glance
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatBytes(totalUsed)} used of {formatBytes(limit)} ({usagePct}%)
            </p>
          </div>
        </div>

        {/* Storage bar */}
        <div className="space-y-1">
          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${barColor}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{formatBytes(totalUsed)} used</span>
            <span>{formatBytes(limit - totalUsed)} free</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg border border-gray-100 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-0.5">
              <HardDriveIcon className="w-3 h-3 text-blue-500" /> Drive
            </div>
            <p className="text-sm font-semibold text-gray-900">{formatBytes(driveUsed)}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-0.5">
              <MailIcon className="w-3 h-3 text-red-500" /> Gmail
            </div>
            <p className="text-sm font-semibold text-gray-900">{formatBytes(totalUsed - driveUsed)}</p>
          </div>
        </div>

        {/* Upsell CTA */}

        {plan === "free" && (
          <Button asChild size="sm" className="w-full gap-1.5">
            <Link href="/dashboard/premium">
              Upgrade to unlock storage transfers <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </Button>
        )}

      </CardContent>
    </Card>
  );
}
