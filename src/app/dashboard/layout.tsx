export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/dal";
import DashboardNav from "@/components/dashboard/DashboardNav";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // requireAuthUser() is memoised via React.cache() — all Server Components
  // in this render pass share the same getUser() result and only one Supabase
  // API call is made, eliminating the concurrent-refresh race condition.
  const user = await requireAuthUser();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, email, plan")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardNav profile={profile} isAdmin={!!ADMIN_EMAIL && profile?.email === ADMIN_EMAIL} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
