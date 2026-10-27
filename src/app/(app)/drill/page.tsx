import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { canManageDrill, isStaff } from "@/lib/permissions";
import { DrillSessionList } from "@/components/drill/drill-session-list";
import { byLastName } from "@/lib/format";

export default async function DrillPage() {
  const profile = await requireProfile();
  if (!isStaff(profile) && !canManageDrill(profile)) redirect("/dashboard");

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const [upcomingRes, pastRes, profilesRes, lrpRes] = await Promise.all([
    // Upcoming: today forward, ascending (nearest first)
    supabase
      .from("drill_sessions")
      .select("*, maa:profiles!drill_sessions_maa_id_fkey(full_name), recorder:profiles!drill_sessions_recorded_by_fkey(full_name)")
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(10),
    // Recent past: before today, descending (most recent first)
    supabase
      .from("drill_sessions")
      .select("*, maa:profiles!drill_sessions_maa_id_fkey(full_name), recorder:profiles!drill_sessions_recorded_by_fkey(full_name)")
      .lt("date", today)
      .order("date", { ascending: false })
      .limit(10),
    supabase
      .from("profiles")
      .select("id, full_name, rank")
      .eq("active", true)
      .eq("approved", true)
      .in("role", ["officer", "snco", "nco"])
      .order("full_name"),
    supabase
      .from("long_range_plan" as never)
      .select("id, week_start, theme, status")
      .gte("week_start", today)
      .order("week_start", { ascending: true })
      .limit(20),
  ]);

  // Upcoming first, then recent past
  const allSessions = [...(upcomingRes.data ?? []), ...(pastRes.data ?? [])];

  // Dates that already have a drill session
  const existingDates = new Set(allSessions.map((s: { date: string }) => s.date));
  const lrpRows = ((lrpRes.data ?? []) as { id: string; week_start: string; theme: string; status: string }[])
    .filter((r) => !existingDates.has(r.week_start));

  return (
    <DrillSessionList
      initialSessions={allSessions as never}
      officers={(profilesRes.data ?? []).sort(byLastName)}
      profile={profile}
      lrpRows={lrpRows}
    />
  );
}
