import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { canManagePod, isLcpo, isLpo } from "@/lib/permissions";
import { PodClient } from "@/components/pod/pod-client";
import { getDrillSuggestions } from "@/app/(app)/drill-suggestions/actions";

export default async function PodPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];

  const [profilesRes, templatesRes, settingsRes, podDatesRes, drillSessionDatesRes, upcomingDrillRes, lrpPlansRes, suggestions] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, rank, role")
      .eq("active", true)
      .eq("approved", true)
      .in("role", ["cadet", "nco", "snco", "officer"])
      .order("full_name"),
    supabase.from("pod_templates").select("*").order("name"),
    supabase.from("site_settings").select("unit_name, motto").eq("id", 1).single(),
    supabase.from("plan_of_day").select("date").order("date", { ascending: true }),
    // All drill session dates (past + future) for navigation
    supabase.from("drill_sessions").select("date").order("date", { ascending: true }),
    // Next upcoming drill session (today or future)
    supabase
      .from("drill_sessions")
      .select("date")
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    // LRP plans with blocks (for POD quick-add)
    supabase
      .from("long_range_plan" as never)
      .select("id, week_start, long_range_plan_blocks(id, topic, block_type)")
      .order("week_start", { ascending: true }),
    getDrillSuggestions(),
  ]);

  // Merge POD dates + drill session dates, deduplicated and sorted
  const podDates = (podDatesRes.data ?? []).map((r) => r.date as string);
  const drillSessionDates = (drillSessionDatesRes.data ?? []).map((r) => r.date as string);
  const allDatesMap: Record<string, true> = {};
  podDates.forEach((d) => { allDatesMap[d] = true; });
  drillSessionDates.forEach((d) => { allDatesMap[d] = true; });
  const allDates = Object.keys(allDatesMap).sort();

  // Default to next upcoming drill session; fall back to today
  const nextDrillDate = (upcomingDrillRes.data as { date: string } | null)?.date ?? today;
  const initialDate = nextDrillDate;

  const [{ data: initialPod }, { data: initialDrillSession }] = await Promise.all([
    supabase.from("plan_of_day").select("*").eq("date", initialDate).maybeSingle(),
    supabase
      .from("drill_sessions")
      .select("id, locked, drill_attendance(status)")
      .eq("date", initialDate)
      .maybeSingle(),
  ]);

  // Compute attendance summary from initial drill session if it is locked
  type AttSummary = { present: number; absent: number; excused: number; total: number } | null;
  let initialAttSummary: AttSummary = null;
  if (initialDrillSession?.locked) {
    const rows = (initialDrillSession as unknown as { drill_attendance: { status: string }[] }).drill_attendance ?? [];
    const counts = { present: 0, absent: 0, excused: 0, late: 0 };
    for (const r of rows) counts[r.status as keyof typeof counts] = (counts[r.status as keyof typeof counts] ?? 0) + 1;
    initialAttSummary = { present: counts.present + counts.late, absent: counts.absent, excused: counts.excused, total: rows.length };
  }

  // Build a map: week_start date → lrp blocks for that date
  type LrpBlock = { id: string; topic: string; block_type: string };
  type LrpPlanRow = { id: string; week_start: string; long_range_plan_blocks: LrpBlock[] };
  const lrpByDate: Record<string, LrpBlock[]> = {};
  for (const plan of (lrpPlansRes.data ?? []) as LrpPlanRow[]) {
    if (plan.week_start) lrpByDate[plan.week_start] = plan.long_range_plan_blocks ?? [];
  }

  const isCoOrXo = profile.role === "officer" &&
    (profile.officer_billet === "co" || profile.officer_billet === "xo");

  // Cadets and NCOs without pod-management permission only see approved PODs
  const canViewAnyStatus = canManagePod(profile) || isCoOrXo;
  const podForUser = canViewAnyStatus
    ? (initialPod ?? null)
    : ((initialPod as unknown as { status?: string } | null)?.status === "approved" ? initialPod : null);

  return (
    <PodClient
      initialPod={podForUser}
      initialDate={initialDate}
      canEdit={canManagePod(profile)}
      canApprove={isCoOrXo}
      canAmend={isCoOrXo || isLcpo(profile) || isLpo(profile)}
      initialDrillSummary={initialAttSummary}
      allProfiles={profilesRes.data ?? []}
      initialTemplates={templatesRes.data ?? []}
      unitName={settingsRes.data?.unit_name ?? "Squadron 7-Zulu"}
      motto={settingsRes.data?.motto ?? "Honor, Courage, Commitment, Service"}
      initialAllDates={allDates}
      lrpByDate={lrpByDate}
      initialSuggestions={suggestions.filter((s) => s.status === "pending")}
      profile={profile}
    />
  );
}
