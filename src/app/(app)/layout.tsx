import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Header } from "@/components/layout/header";
import { navForRole } from "@/lib/nav";
import { Anchor } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { GlobalNotifications } from "@/components/shared/global-notifications";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: settings } = await supabase.from("site_settings").select("*").eq("id", 1).single();
  const unitName = settings?.unit_name ?? "Squadron 7-Zulu & TS Wasp";

  const pendingCount =
    profile.approved && profile.role === "officer"
      ? (await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("approved", false)).count ?? 0
      : 0;

  if (!profile.approved) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#003087] bg-white">
          <Anchor className="h-7 w-7 text-[#003087]" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-[#003087]">Pending Approval</h1>
        <p className="mt-2 max-w-sm text-sm text-gray-500">
          Your account has been created and is awaiting approval from a Squadron Officer. You&apos;ll
          be able to access the portal once approved.
        </p>
        <form action={logout} className="mt-6">
          <button type="submit" className="text-sm font-medium text-[#003087] underline">
            Log Out
          </button>
        </form>
      </main>
    );
  }

  const items = navForRole(profile.role);

  return (
    <div className="flex min-h-screen">
      <GlobalNotifications profileId={profile.id} />
      <Sidebar items={items} unitName={unitName} role={profile.role} initialPendingCount={pendingCount} />
      <div className="flex flex-1 flex-col">
        <Header profile={profile} unitName={unitName} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 pb-20 sm:p-6 md:pb-6">{children}</main>
      </div>
      <MobileNav items={items} role={profile.role} initialPendingCount={pendingCount} />
    </div>
  );
}
