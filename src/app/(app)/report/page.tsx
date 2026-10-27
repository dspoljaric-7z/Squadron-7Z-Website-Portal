import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { isSeniorStaff } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { UnitReportClient } from "@/components/report/unit-report-client";

export default async function UnitReportPage() {
  const profile = await requireProfile();
  if (!isSeniorStaff(profile)) redirect("/dashboard");

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [
    membersRes,
    activeRes,
    sessionsRes,
    openCorrectionsRes,
    openPipsRes,
    activePipelinesRes,
    upcomingEventsRes,
    expiredDocsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id, role, division_id, billet", { count: "exact" }).eq("active", true).eq("approved", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("active", true).eq("approved", true),
    supabase
      .from("drill_sessions")
      .select("id, date, attendance(status)")
      .gte("date", thirtyDaysAgo)
      .lte("date", today)
      .order("date", { ascending: false }),
    supabase.from("corrections").select("id, tier, cadet_id, issued_at", { count: "exact" }).eq("status", "open"),
    supabase.from("pips").select("id, cadet_id", { count: "exact" }).in("status", ["open", "pending_ack"]),
    supabase
      .from("billet_nominations")
      .select("id, billet_name, stage", { count: "exact" })
      .not("stage", "in", '("confirmed","not_selected")'),
    supabase
      .from("events")
      .select("id, title, start_time, event_type, rsvp_required")
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .limit(10),
    supabase
      .from("document_submissions")
      .select("id, document_type_id, cadet_id, expiry_date", { count: "exact" })
      .lte("expiry_date", today),
  ]);

  // Attendance rate over last 30 days
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessions = ((sessionsRes.data ?? []) as any[]) as {
    id: string;
    date: string;
    attendance: { status: string }[];
  }[];
  let totalAttRows = 0;
  let presentAttRows = 0;
  for (const s of sessions) {
    const att = (s.attendance ?? []) as { status: string }[];
    totalAttRows += att.length;
    presentAttRows += att.filter((a) => a.status === "present").length;
  }
  const attendanceRate30d = totalAttRows > 0 ? Math.round((presentAttRows / totalAttRows) * 100) : null;

  // Billets filled/empty
  const allProfiles = (membersRes.data ?? []) as { id: string; billet: string | null; role: string }[];
  const billetsFilled = allProfiles.filter((p) => p.billet).length;

  return (
    <UnitReportClient
      generatedAt={new Date().toISOString()}
      totalMembers={activeRes.count ?? 0}
      attendanceRate30d={attendanceRate30d}
      attendanceSessions={sessions.length}
      openCorrectionsCount={openCorrectionsRes.count ?? 0}
      openPipsCount={openPipsRes.count ?? 0}
      activePipelinesCount={activePipelinesRes.count ?? 0}
      billetsFilled={billetsFilled}
      upcomingEvents={(upcomingEventsRes.data ?? []) as never}
      expiredDocsCount={expiredDocsRes.count ?? 0}
      openCorrections={(openCorrectionsRes.data ?? []) as never}
      openPips={(openPipsRes.data ?? []) as never}
      activePipelines={(activePipelinesRes.data ?? []) as never}
    />
  );
}
