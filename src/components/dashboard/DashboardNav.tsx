"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CloudIcon, HardDriveIcon, MailIcon, StarIcon, UsersIcon,
  LogOutIcon, HistoryIcon, ShieldIcon, MenuIcon, XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { planAllows, planLabel, planBadgeVariant, type Plan } from "@/lib/plan";

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  plan?: Plan;
}

type Feature = "gmail" | "drive" | "photos" | "external";

const navItems: { href: string; label: string; icon: React.ElementType; exact?: boolean; requiresPlan?: Feature }[] = [
  { href: "/dashboard",          label: "Overview",       icon: CloudIcon,      exact: true },
  { href: "/dashboard/accounts", label: "Accounts",       icon: UsersIcon },
  { href: "/dashboard/gmail",    label: "Gmail Transfer", icon: MailIcon },
  { href: "/dashboard/drive",    label: "Drive Transfer", icon: HardDriveIcon,  requiresPlan: "drive"    },
  { href: "/dashboard/premium",  label: "Pro Transfers",  icon: StarIcon,       requiresPlan: "external" },
  { href: "/dashboard/history",  label: "History",        icon: HistoryIcon },
];

export default function DashboardNav({ profile, isAdmin = false }: { profile: Profile | null; isAdmin?: boolean }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const supabase  = createClient();
  const plan      = profile?.plan ?? "free";
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Main bar ── */}
        <div className="flex items-center justify-between py-1">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-gray-900">
            <img src="/logo.png" alt="GTransfer" className="w-10 h-10 object-contain" />
            <span className="hidden sm:inline text-lg">GTransfer</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon, exact, requiresPlan }) => {
              const active = exact ? pathname === href : pathname.startsWith(href) && href !== "/dashboard";
              const locked = requiresPlan ? !planAllows(plan, requiresPlan) : false;
              return (
                <Link
                  key={href}
                  href={locked ? "/dashboard/premium" : href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {requiresPlan && (
                    <Badge
                      variant={locked ? "outline" : planBadgeVariant(plan)}
                      className="ml-1 text-xs py-0 px-1.5"
                    >
                      {requiresPlan === "external" ? "PRO" : "ESS+"}
                    </Badge>
                  )}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/dashboard/admin"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith("/dashboard/admin")
                    ? "bg-red-50 text-red-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <ShieldIcon className="w-4 h-4" />
                Admin
              </Link>
            )}
          </div>

          {/* Right side: plan badge + avatar + hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Badge variant={planBadgeVariant(plan)} className="hidden sm:flex text-xs">
              {planLabel(plan)}
            </Badge>

            {/* Avatar */}
            <div className="hidden sm:flex items-center gap-2">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                  {(profile?.full_name ?? profile?.email ?? "?")[0].toUpperCase()}
                </div>
              )}
              <span className="hidden lg:block text-sm text-gray-700 max-w-32 truncate">
                {profile?.full_name ?? profile?.email}
              </span>
            </div>

            {/* Desktop sign-out */}
            <button
              onClick={signOut}
              className="hidden sm:flex p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
              title="Sign out"
            >
              <LogOutIcon className="w-4 h-4" />
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              aria-label="Open menu"
            >
              {menuOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white pb-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">

            {/* User info row */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100 mb-2">
              <div className="flex items-center gap-2">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    {(profile?.full_name ?? profile?.email ?? "?")[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 truncate max-w-48">
                    {profile?.full_name ?? profile?.email}
                  </p>
                  <Badge variant={planBadgeVariant(plan)} className="text-xs mt-0.5">
                    {planLabel(plan)}
                  </Badge>
                </div>
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 px-2 py-1 rounded-lg"
              >
                <LogOutIcon className="w-4 h-4" />
                Sign out
              </button>
            </div>

            {/* Nav items */}
            <div className="space-y-1">
              {navItems.map(({ href, label, icon: Icon, exact, requiresPlan }) => {
                const active = exact ? pathname === href : pathname.startsWith(href) && href !== "/dashboard";
                const locked = requiresPlan ? !planAllows(plan, requiresPlan) : false;
                return (
                  <Link
                    key={href}
                    href={locked ? "/dashboard/premium" : href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      active ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="flex-1">{label}</span>
                    {requiresPlan && (
                      <Badge
                        variant={locked ? "outline" : planBadgeVariant(plan)}
                        className="text-xs py-0 px-1.5"
                      >
                        {requiresPlan === "external" ? "PRO" : "ESS+"}
                      </Badge>
                    )}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  href="/dashboard/admin"
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    pathname.startsWith("/dashboard/admin") ? "bg-red-50 text-red-700" : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <ShieldIcon className="w-5 h-5 shrink-0" />
                  Admin
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
