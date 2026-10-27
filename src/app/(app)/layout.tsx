import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Header } from "@/components/layout/header";
import { navForProfile } from "@/lib/nav";
import { isOfficer, isStaff, isDivisionLeader } from "@/lib/permissions";
import { Shield } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { GlobalNotifications } from "@/components/shared/global-notifications";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: settings } = await supabase.from("site_settings").select("*").eq("id", 1).single();
  const unitName = settings?.unit_name ?? "Squadron 7-Zulu";

  const audienceMap: Record<string, string[]> = {
    officer: ["all", "officers_sncOs", "ncos_plus"],
    snco:    ["all", "officers_sncOs", "ncos_plus"],
    nco:     ["all", "ncos_plus"],
    cadet:   ["all", "cadets_only"],
    parent:  ["all"],
  };
  const allowedAudiences = audienceMap[profile.role] ?? ["all"];

  const [pendingCount, pendingPodCount, pendingAbsenceCount, unreadAnnouncementsCount, incompleteOnboardingCount] = await Promise.all([
    profile.approved && isOfficer(profile)
      ? supabase.from("profiles").select("id", { count: "exact", head: true }).eq("approved", false).then(({ count }) => count ?? 0)
      : Promise.resolve(0),
    profile.approved && isOfficer(profile)
      ? supabase.from("plan_of_day" as never).select("id", { count: "exact", head: true }).eq("status", "submitted").then(({ count }: { count: number | null }) => count ?? 0)
      : Promise.resolve(0),
    profile.approved && (isStaff(profile) || isDivisionLeader(profile))
      ? supabase.from("absence_requests" as never).select("id", { count: "exact", head: true }).eq("status", "pending").then(({ count }: { count: number | null }) => count ?? 0)
      : Promise.resolve(0),
    // Unread announcements for everyone
    profile.approved
      ? supabase
          .from("announcements")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .select("id", { count: "exact", head: true })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .in("audience", allowedAudiences as any)
          .not("id", "in", `(SELECT announcement_id FROM announcement_reads WHERE profile_id = '${profile.id}')`)
          .then(({ count }) => count ?? 0)
      : Promise.resolve(0),
    // Incomplete required onboarding steps for cadets
    profile.approved && profile.role === "cadet"
      ? supabase
          .from("onboarding_steps" as never)
          .select("id", { count: "exact", head: true })
          .eq("active", true)
          .eq("required", true)
          .not("id", "in", `(SELECT step_id FROM cadet_onboarding WHERE cadet_id = '${profile.id}' AND completed = true)`)
          .then(({ count }: { count: number | null }) => count ?? 0)
      : Promise.resolve(0),
  ]);

  if (!profile.approved) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#003087] bg-white">
          <Shield className="h-7 w-7 text-[#003087]" />
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

  const items = navForProfile(profile);

  return (
    <div className="flex h-screen overflow-hidden">
      <GlobalNotifications profileId={profile.id} />
      <Sidebar items={items} unitName={unitName} role={profile.role} fullName={profile.full_name} title={profile.billet} initialPendingCount={pendingCount} initialPendingPodCount={pendingPodCount} initialPendingAbsenceCount={pendingAbsenceCount} initialUnreadAnnouncementsCount={unreadAnnouncementsCount} initialIncompleteOnboardingCount={incompleteOnboardingCount} profileId={profile.id} />
      <div className="flex flex-1 flex-col">
        <Header profile={profile} unitName={unitName} />
        <main className="flex-1 overflow-y-auto bg-[#f3f5f8] p-4 pb-20 sm:p-6 md:pb-6">{children}</main>
      </div>
      <MobileNav items={items} role={profile.role} initialPendingCount={pendingCount} />
    </div>
  );
}
