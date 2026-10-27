import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { isStaff, isSeniorStaff, isCommand, canManageDiscipline } from "@/lib/permissions";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { QUAL_TYPES } from "@/lib/constants";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];
  const staff = isStaff(profile);
  const seniorStaff = isSeniorStaff(profile);
  const command = isCommand(profile);
  const disciplineMgr = canManageDiscipline(profile);
  const lcpo = profile.is_lcpo === true;
  const isCoOrXo = profile.role === "officer" &&
    (profile.officer_billet === "co" || profile.officer_billet === "xo");

  // New staff: joined within 30 days and is a staff role
  const staffJoinedAt = staff && profile.created_at ? new Date(profile.created_at) : null;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const isNewStaff = staffJoinedAt != null && staffJoinedAt > thirtyDaysAgo;

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
        .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(6),
      staff
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

  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - 3);

  const [correctionsRes, nominationsRes, pipsRes, pendingAbsenceRes, staleAbsenceRes, submittedPodRes] = await Promise.all([
    command
      ? supabase.from("corrections").select("id", { count: "exact", head: true }).eq("status", "open")
      : Promise.resolve({ count: null } as { count: number | null }),
    seniorStaff
      ? supabase
          .from("billet_nominations")
          .select("id", { count: "exact", head: true })
          .not("stage", "in", '("confirmed","not_selected")')
      : Promise.resolve({ count: null } as { count: number | null }),
    (command || disciplineMgr)
      ? supabase.from("pips").select("id", { count: "exact", head: true }).eq("status", "open")
      : Promise.resolve({ count: null } as { count: number | null }),
    staff
      ? supabase.from("absence_requests").select("id", { count: "exact", head: true }).eq("status", "pending")
      : Promise.resolve({ count: null } as { count: number | null }),
    staff
      ? supabase.from("absence_requests").select("id", { count: "exact", head: true }).eq("status", "pending").lt("created_at", staleDate.toISOString())
      : Promise.resolve({ count: null } as { count: number | null }),
    isCoOrXo
      ? supabase.from("plan_of_day").select("id", { count: "exact", head: true }).eq("status", "submitted")
      : Promise.resolve({ count: null } as { count: number | null }),
  ]);

  // Personal stats — for all non-parent members viewing their own record
  let myAttendancePct = 0;
  let myAttendanceTotal = 0;
  let myQualsDone = 0;
  let myOpenCorrections = 0;
  let totalQuals = QUAL_TYPES.length;
  let recentAbsenceDecisions: { id: string; requested_date: string; request_type: string | null; status: string; review_notes: string | null; created_at: string }[] = [];

  if (profile.role !== "parent") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const [attRes, qualsRes, myCorrsRes, qtRes, recentDecisionsRes] = await Promise.all([
      supabase.from("attendance").select("status").eq("cadet_id", profile.id),
      supabase
        .from("qualifications")
        .select("status")
        .eq("cadet_id", profile.id)
        .eq("status", "completed"),
      supabase
        .from("corrections")
        .select("id", { count: "exact", head: true })
        .eq("cadet_id", profile.id)
        .eq("status", "open"),
      supabase.from("qual_types").select("name", { count: "exact", head: true }).eq("active", true),
      supabase
        .from("absence_requests")
        .select("id, requested_date, request_type, status, review_notes, created_at")
        .eq("cadet_id", profile.id)
        .in("status", ["approved", "denied"])
        .gte("updated_at" as never, sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    const att = attRes.data ?? [];
    myAttendanceTotal = att.length;
    const present = att.filter((a) => a.status === "present").length;
    myAttendancePct = myAttendanceTotal > 0 ? Math.round((present / myAttendanceTotal) * 100) : 0;
    myQualsDone = (qualsRes.data ?? []).length;
    myOpenCorrections = myCorrsRes.count ?? 0;
    totalQuals = qtRes.count ?? QUAL_TYPES.length;
    recentAbsenceDecisions = (recentDecisionsRes.data ?? []) as typeof recentAbsenceDecisions;
  }

  // Officer/SNCO: unit health stats — attendance last 3 drills, overdue docs
  let unitAttendanceLast3 = 0;
  let overdueDocsCount = 0;
  if (seniorStaff) {
    const { data: last3Sessions } = await supabase
      .from("drill_sessions")
      .select("id")
      .order("date", { ascending: false })
      .limit(3);
    const sessionIds = (last3Sessions ?? []).map((s: { id: string }) => s.id);
    if (sessionIds.length > 0) {
      const { data: attRows } = await supabase
        .from("drill_attendance")
        .select("status")
        .in("session_id", sessionIds);
      const allRows = attRows ?? [];
      const presentRows = allRows.filter((a: { status: string }) => a.status === "present");
      unitAttendanceLast3 = allRows.length > 0 ? Math.round((presentRows.length / allRows.length) * 100) : 0;
    }
    const { count: expiredCount } = await supabase
      .from("document_submissions")
      .select("id", { count: "exact", head: true })
      .lte("expiry_date", new Date().toISOString().split("T")[0]);
    overdueDocsCount = expiredCount ?? 0;
  }

  // NCO: division stats
  let divisionMemberCount = 0;
  let divisionAttendancePct = 0;
  if (profile.role === "nco" && profile.division_id) {
    const { count: divCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("division_id", profile.division_id)
      .eq("active", true)
      .eq("approved", true)
      .eq("role", "cadet");
    divisionMemberCount = divCount ?? 0;
    const { data: divCadets } = await supabase
      .from("profiles")
      .select("id")
      .eq("division_id", profile.division_id)
      .eq("active", true)
      .eq("approved", true)
      .eq("role", "cadet");
    if (divCadets && divCadets.length > 0) {
      const divCadetIds = divCadets.map((c: { id: string }) => c.id);
      const { data: divAtt } = await supabase
        .from("drill_attendance")
        .select("status")
        .in("cadet_id", divCadetIds);
      const allDivAtt = divAtt ?? [];
      divisionAttendancePct = allDivAtt.length > 0
        ? Math.round((allDivAtt.filter((a: { status: string }) => a.status === "present").length / allDivAtt.length) * 100)
        : 0;
    }
  }

  // Cadet: missing docs count
  let missingDocsCount = 0;
  if (!staff && profile.role !== "parent") {
    const { data: docTypes } = await supabase.from("document_types" as never).select("id").eq("active", true).eq("required", true);
    const { data: docSubs } = await supabase.from("document_submissions" as never).select("document_type_id, expiry_date").eq("cadet_id", profile.id).eq("status", "collected");
    const reqTypes = (docTypes ?? []) as { id: string }[];
    const subs = (docSubs ?? []) as { document_type_id: string; expiry_date: string | null }[];
    const today = new Date().toISOString().split("T")[0];
    const validSubs = new Set(subs.filter((s) => !s.expiry_date || s.expiry_date > today).map((s) => s.document_type_id));
    missingDocsCount = reqTypes.filter((t) => !validSubs.has(t.id)).length;
  }

  // LCPO: unit health aggregate — paperwork expiring soon, open PIPs, last inspection
  let expiringPaperworkCount = 0;
  let lcpoOpenPipsCount = 0;
  let lastInspectionDate: string | null = null;
  let vacantBilletsCount = 0;
  if (lcpo) {
    const thirtyDaysOut = new Date();
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
    const [pwRes, pipsRes2, inspRes, vacantRes] = await Promise.all([
      supabase
        .from("cadet_paperwork" as never)
        .select("id", { count: "exact", head: true })
        .lte("expiry_date", thirtyDaysOut.toISOString().split("T")[0])
        .gte("expiry_date", today),
      supabase
        .from("pips")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      supabase
        .from("uniform_inspection_sessions")
        .select("date")
        .order("date", { ascending: false })
        .limit(1),
      supabase
        .from("billets")
        .select("id", { count: "exact", head: true })
        .eq("active", true)
        .is("assigned_to", null),
    ]);
    expiringPaperworkCount = (pwRes as { count: number | null }).count ?? 0;
    lcpoOpenPipsCount = pipsRes2.count ?? 0;
    lastInspectionDate = (inspRes.data ?? [])[0]?.date ?? null;
    vacantBilletsCount = vacantRes.count ?? 0;
  }

  // Next upcoming drill session + LRP theme
  const { data: nextDrillData } = await supabase
    .from("drill_sessions")
    .select("id, date, location, uniform_of_day, notes")
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(1);
  const nextDrillRaw = nextDrillData?.[0] ?? null;
  let nextDrillTheme: string | null = null;
  if (nextDrillRaw) {
    const { data: lrpRow } = await supabase
      .from("plan_of_day")
      .select("training_objective")
      .eq("date", nextDrillRaw.date)
      .maybeSingle();
    if (lrpRow?.training_objective) {
      nextDrillTheme = lrpRow.training_objective;
    } else {
      const { data: lrpThemeRow } = await supabase
        .from("long_range_plan" as never)
        .select("theme")
        .eq("week_start", nextDrillRaw.date)
        .maybeSingle();
      nextDrillTheme = (lrpThemeRow as { theme: string | null } | null)?.theme ?? null;
    }
  }
  const nextDrillSession = nextDrillRaw ? { ...nextDrillRaw, theme: nextDrillTheme } : null;

  // Next TSW meeting session + LRP theme
  type TswMeetingRow = { date: string };
  const { data: nextTswMeetingData } = await supabase
    .from("tsw_meeting_sessions" as never)
    .select("date")
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();
  const nextTswDate = (nextTswMeetingData as TswMeetingRow | null)?.date ?? null;
  let nextTswTheme: string | null = null;
  if (nextTswDate) {
    const { data: tswLrpRow } = await supabase
      .from("tsw_long_range_plans" as never)
      .select("theme")
      .eq("date", nextTswDate)
      .maybeSingle();
    nextTswTheme = (tswLrpRow as { theme: string | null } | null)?.theme ?? null;
  }
  const nextTswSession = nextTswDate ? { date: nextTswDate, theme: nextTswTheme } : null;

  // Saved links for all users
  const { data: savedLinksData } = await supabase
    .from("saved_links" as never)
    .select("*")
    .order("sort_order", { ascending: true });
  const savedLinks = (savedLinksData ?? []) as import("@/types/database").SavedLink[];

  // Parent: fetch their linked cadet
  let linkedCadet = null;
  let cadetAttendance = null;
  if (profile.role === "parent" && profile.parent_of) {
    const [cadetRes, attendanceRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", profile.parent_of).single(),
      supabase
        .from("attendance")
        .select("*, events(title, start_time)")
        .eq("cadet_id", profile.parent_of)
        .order("recorded_at", { ascending: false })
        .limit(15),
    ]);
    linkedCadet = cadetRes.data ?? null;
    cadetAttendance = (attendanceRes.data ?? null) as never;
  }

  return (
    <DashboardClient
      profile={profile}
      initialEvents={eventsRes.data ?? []}
      initialAnnouncements={announcementsRes.data ?? []}
      initialPendingCount={pendingRes.count ?? 0}
      pendingAbsenceCount={staff ? (pendingAbsenceRes.count ?? 0) : undefined}
      memberCount={memberCountRes.count ?? 0}
      todayPod={podRes.data ?? null}
      linkedCadet={linkedCadet}
      cadetAttendance={cadetAttendance}
      openCorrectionsCount={correctionsRes.count ?? undefined}
      activePipelinesCount={nominationsRes.count ?? undefined}
      openPipsCount={pipsRes.count ?? undefined}
      myAttendancePct={myAttendancePct}
      myAttendanceTotal={myAttendanceTotal}
      myQualsDone={myQualsDone}
      myOpenCorrections={myOpenCorrections}
      totalQuals={totalQuals}
      missingDocsCount={missingDocsCount}
      unitAttendanceLast3={seniorStaff ? unitAttendanceLast3 : undefined}
      overdueDocsCount={seniorStaff ? overdueDocsCount : undefined}
      divisionMemberCount={profile.role === "nco" ? divisionMemberCount : undefined}
      divisionAttendancePct={profile.role === "nco" ? divisionAttendancePct : undefined}
      expiringPaperworkCount={lcpo ? expiringPaperworkCount : undefined}
      lcpoOpenPipsCount={lcpo ? lcpoOpenPipsCount : undefined}
      lastInspectionDate={lcpo ? lastInspectionDate : undefined}
      vacantBilletsCount={lcpo ? vacantBilletsCount : undefined}
      staleAbsenceCount={staff ? (staleAbsenceRes.count ?? 0) : undefined}
      submittedPodCount={isCoOrXo ? (submittedPodRes.count ?? 0) : undefined}
      isNewStaff={isNewStaff}
      nextDrillSession={nextDrillSession}
      nextTswSession={nextTswSession}
      savedLinks={savedLinks}
      recentAbsenceDecisions={recentAbsenceDecisions}
    />
  );
}
