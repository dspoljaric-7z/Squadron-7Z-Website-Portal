import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];

  const [eventsRes, announcementsRes, pendingRes, memberCountRes, podRes] =
    await Promise.all([
      supabase
        .from("events")
        .select("*")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(6),
      supabase
        .from("announcements")
        .select("*, profiles:posted_by(full_name, rank)")
        .order("created_at", { ascending: false })
        .limit(6),
      profile.role === "officer" || profile.role === "snco" || profile.role === "nco"
        ? supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("approved", false)
        : Promise.resolve({ count: 0 } as { count: number | null }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("active", true)
        .eq("approved", true),
      supabase.from("plan_of_day").select("*").eq("date", today).maybeSingle(),
    ]);

  return (
    <DashboardClient
      profile={profile}
      initialEvents={eventsRes.data ?? []}
      initialAnnouncements={announcementsRes.data ?? []}
      initialPendingCount={pendingRes.count ?? 0}
      memberCount={memberCountRes.count ?? 0}
      todayPod={podRes.data ?? null}
    />
  );
}
