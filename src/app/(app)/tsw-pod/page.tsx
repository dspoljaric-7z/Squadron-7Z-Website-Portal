import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { canManagePod } from "@/lib/permissions";
import { TswPodClient } from "./tsw-pod-client";

export const metadata = { title: "TSW Plan of Day" };

export default async function TswPodPage({ searchParams }: { searchParams?: { date?: string; edit?: string } }) {
  const profile = await requireProfile();

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [profilesRes, allDatesRes, upcomingMeetingRes, tswLrpRes, allMeetingSessionsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, rank, role")
      .eq("active", true)
      .eq("approved", true)
      .in("role", ["cadet", "nco", "snco", "officer"])
      .order("full_name"),
    supabase.from("tsw_plan_of_day" as never).select("date").order("date", { ascending: true }),
    supabase
      .from("tsw_meeting_sessions" as never)
      .select("date")
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("tsw_long_range_plans" as never)
      .select("id, date, tsw_lrp_blocks(id, topic, block_type)")
      .order("date", { ascending: true }),
    supabase
      .from("tsw_meeting_sessions" as never)
      .select("id, date")
      .order("date", { ascending: true }),
  ]);

  // Merge LRP drill dates with existing POD dates so staff can navigate to any scheduled TSW date
  // Always include today so navigation never gets stuck with both arrows grayed out
  const lrpDates = (tswLrpRes.data ?? []).map((r) => (r as { date: string }).date).filter(Boolean);
  const podDates = (allDatesRes.data ?? []).map((r) => (r as { date: string }).date);
  const allDates = Array.from(new Set([...podDates, ...lrpDates, today])).sort();

  const nextLrpDate = lrpDates.filter((d) => d >= today).sort()[0] ?? null;
  const nextMeetingSessionDate = (upcomingMeetingRes.data as { date: string } | null)?.date ?? null;
  // Allow ?date= param to land on a specific date (e.g. from calendar modal link)
  const paramDate = searchParams?.date ?? null;
  const initialDate = (paramDate && allDates.includes(paramDate) ? paramDate : null) ?? nextMeetingSessionDate ?? nextLrpDate ?? today;
  const initialEditing = searchParams?.edit === "true" && canManagePod(profile);
  type MeetingSession = { id: string; date: string };
  const initialMeetingSessions = (allMeetingSessionsRes.data ?? []) as MeetingSession[];

  const { data: initialPod } = await supabase
    .from("tsw_plan_of_day" as never)
    .select("*")
    .eq("date", initialDate)
    .maybeSingle();

  // Build LRP quick-add map
  type LrpBlock = { id: string; topic: string; block_type: string };
  type LrpRow = { id: string; date: string; tsw_lrp_blocks: LrpBlock[] };
  const lrpByDate: Record<string, LrpBlock[]> = {};
  for (const plan of (tswLrpRes.data ?? []) as LrpRow[]) {
    if (plan.date) lrpByDate[plan.date] = plan.tsw_lrp_blocks ?? [];
  }

  return (
    <TswPodClient
      initialPod={initialPod ?? null}
      initialDate={initialDate}
      initialEditing={initialEditing}
      canEdit={canManagePod(profile)}
      allProfiles={profilesRes.data ?? []}
      initialAllDates={allDates}
      lrpByDate={lrpByDate}
      initialMeetingSessions={initialMeetingSessions}
      profile={profile}
    />
  );
}
