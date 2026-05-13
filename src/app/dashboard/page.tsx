export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { HardDriveIcon, MailIcon, ArrowRightIcon, UsersIcon, LockIcon } from "lucide-react";
import { formatDate, formatBytes } from "@/lib/utils";
import StorageOverview from "@/components/dashboard/StorageOverview";
import StorageUpsell from "@/components/dashboard/StorageUpsell";
import { planAllows, planBadgeVariant, FREE_EMAIL_LIMIT_BYTES, type Plan } from "@/lib/plan";
// Photos transfer is not yet available — hidden from UI

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: accounts }, { data: recentJobs }] = await Promise.all([
    supabase.from("profiles").select("full_name, plan, email_transfer_bytes").eq("id", user.id).single(),
    supabase.from("connected_accounts").select("id, google_email, role, avatar_url").eq("user_id", user.id),
    supabase.from("transfer_jobs").select("id, type, status, total_files, transferred_files, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
  ]);

  const plan = (profile?.plan as Plan) ?? "free";
  const emailUsedBytes = profile?.email_transfer_bytes ?? 0;
  const emailPctUsed = plan === "free" ? Math.min(100, Math.round((emailUsedBytes / FREE_EMAIL_LIMIT_BYTES) * 100)) : null;

  const features = [
    {
      title: "Gmail Transfer",
      description: plan === "free"
        ? `Transfer emails between accounts · ${formatBytes(emailUsedBytes)} of 10 GB used`
        : "Transfer emails between Google accounts — unlimited",
      icon: MailIcon,
      href: "/dashboard/gmail",
      color: "text-red-600",
      bg: "bg-red-50",
      available: true,
      planRequired: null as null | string,
    },
    {
      title: "Drive Transfer",
      description: "Move or copy files between Google Drive accounts",
      icon: HardDriveIcon,
      href: "/dashboard/drive",
      color: "text-blue-600",
      bg: "bg-blue-50",
      available: planAllows(plan, "drive"),
      planRequired: "Essential",
    },
  ];

  const statusColors: Record<string, string> = {
    completed: "success",
    running: "default",
    failed: "destructive",
    pending: "secondary",
    cancelled: "outline",
  };

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-gray-500 mt-1">
            You have {accounts?.length ?? 0} connected Google account{(accounts?.length ?? 0) !== 1 ? "s" : ""}.
          </p>
        </div>
        <Badge variant={planBadgeVariant(plan)} className="text-sm px-3 py-1">
          {plan === "free" ? "Free Plan" : plan === "essential" ? "Essential" : "Pro"}
        </Badge>
      </div>

      {/* Free tier usage bar */}
      {plan === "free" && emailPctUsed !== null && (
        <Card className="border-blue-100 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Free plan email transfer usage</p>
              <span className="text-xs text-gray-500">{formatBytes(emailUsedBytes)} / 10 GB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${emailPctUsed > 80 ? "bg-red-500" : "bg-blue-500"}`}
                style={{ width: `${emailPctUsed}%` }}
              />
            </div>
            {emailPctUsed > 80 && (
              <p className="text-xs text-red-600 mt-1.5">
                Running low.{" "}
                <Link href="/dashboard/premium" className="underline font-medium">Upgrade to Essential</Link>
                {" "}for unlimited transfers.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map(({ title, description, icon: Icon, href, color, bg, available, planRequired }) => (
          <Link key={href} href={available ? href : "/dashboard/premium"}>
            <Card className={`h-full hover:shadow-md transition-shadow cursor-pointer ${!available ? "opacity-75" : ""}`}>
              <CardContent className="p-5">
                <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
                  {planRequired && (
                    <Badge
                      variant={available ? planBadgeVariant(plan) : "outline"}
                      className="text-xs shrink-0"
                    >
                      {planRequired.toUpperCase()}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{description}</p>
                <div className="flex items-center gap-1 mt-3 text-xs font-medium">
                  {available ? (
                    <span className="text-blue-600 flex items-center gap-1">Get started <ArrowRightIcon className="w-3 h-3" /></span>
                  ) : (
                    <span className="text-gray-400 flex items-center gap-1"><LockIcon className="w-3 h-3" /> Upgrade to unlock</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Storage upsell — shows current Google storage & "free up X GB" CTA */}
      {plan !== "pro" && (
        <StorageUpsell
          plan={plan}
          primaryAccountId={accounts?.[0]?.id ?? null}
          emailUsedBytes={emailUsedBytes}
        />
      )}

      {/* Storage overview */}
      <StorageOverview />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connected accounts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Connected Accounts</CardTitle>
              <Link href="/dashboard/accounts" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                Manage <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {!accounts?.length ? (
              <div className="text-center py-6 text-gray-400">
                <UsersIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No accounts connected yet</p>
                <Link href="/dashboard/accounts" className="text-xs text-blue-600 hover:underline mt-1 block">Connect your first account</Link>
              </div>
            ) : (
              accounts.map((acc) => (
                <div key={acc.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  {acc.avatar_url ? (
                    <img src={acc.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                      {acc.google_email[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{acc.google_email}</p>
                  </div>
                  <Badge variant={acc.role === "primary" ? "default" : "secondary"} className="text-xs">
                    {acc.role}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent jobs */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Transfers</CardTitle>
              <Link href="/dashboard/history" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View all <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {!recentJobs?.length ? (
              <div className="text-center py-6 text-gray-400">
                <p className="text-sm">No transfers yet</p>
              </div>
            ) : (
              recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">{job.type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-gray-500">{formatDate(job.created_at)} · {job.transferred_files}/{job.total_files} files</p>
                  </div>
                  <Badge variant={statusColors[job.status] as "success" | "default" | "destructive" | "secondary" | "outline"}>
                    {job.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
