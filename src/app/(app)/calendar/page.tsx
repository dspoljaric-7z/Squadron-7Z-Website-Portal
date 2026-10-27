import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CalendarClient } from "@/components/calendar/calendar-client";

export default async function CalendarPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const today = new Date().toISOString().split("T")[0];
  const canEdit = profile.role === "officer" || profile.role === "snco";

  const [{ data: events }, { data: tswEntries }, { data: lrpRows }, { data: drillSessions }, { data: tswLrpRows }, { data: podRows }, absenceCountsRes] = await Promise.all([
    supabase.from("events").select("*").order("start_time", { ascending: true }),
    supabase.from("tsw_calendar").select("*").order("date", { ascending: true }),
    supabase.from("long_range_plan" as never).select("id, week_start, theme").order("week_start", { ascending: true }),
    supabase.from("drill_sessions").select("id, date, locked").order("date", { ascending: true }),
    adminSupabase.from("tsw_long_range_plans" as never).select("id, date, theme, notes").order("date", { ascending: true }),
    supabase.from("plan_of_day").select("id, date, training_objective, notes, status").order("date", { ascending: true }),
    // Absence counts per date (staff only) — fetch pending requests for upcoming dates
    canEdit
      ? supabase.from("absence_requests" as never).select("requested_date").eq("status", "pending").gte("requested_date", today)
      : Promise.resolve({ data: [] }),
  ]);

  type LrpRow = { id: string; week_start: string; theme: string | null };
  type TswLrpRow = { id: string; date: string; theme: string | null; notes: string | null };
  type DrillSession = { id: string; date: string; locked: boolean };
  type PodRow = { id: string; date: string; training_objective: string | null; notes: string | null; status: string | null };
  type AbsenceRow = { requested_date: string };

  // Build absence count map: date → count of pending requests
  const absenceRows = (absenceCountsRes.data ?? []) as AbsenceRow[];
  const absenceCountsByDate: Record<string, number> = {};
  for (const row of absenceRows) {
    absenceCountsByDate[row.requested_date] = (absenceCountsByDate[row.requested_date] ?? 0) + 1;
  }

  // Build POD status map: date → status
  const podStatusByDate: Record<string, string | null> = {};
  for (const pod of (podRows ?? []) as PodRow[]) {
    podStatusByDate[pod.date] = pod.status;
  }

  return (
    <CalendarClient
      initialEvents={events ?? []}
      initialTswEntries={tswEntries ?? []}
      initialLrpRows={(lrpRows ?? []) as LrpRow[]}
      initialTswLrpRows={(tswLrpRows ?? []) as TswLrpRow[]}
      initialDrillSessions={(drillSessions ?? []) as DrillSession[]}
      initialPodRows={(podRows ?? []) as PodRow[]}
      podStatusByDate={podStatusByDate}
      absenceCountsByDate={canEdit ? absenceCountsByDate : {}}
      canEdit={canEdit}
      profileId={profile.id}
      profile={profile}
    />
  );
}
