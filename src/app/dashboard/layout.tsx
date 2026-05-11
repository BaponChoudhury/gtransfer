export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardNav from "@/components/dashboard/DashboardNav";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient().catch(() => redirect("/login"));

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

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
