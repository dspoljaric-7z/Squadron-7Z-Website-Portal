import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { MyRecordClient } from "@/components/my-record/my-record-client";
import { AbsenceRequestButton } from "@/components/absence-requests/absence-request-button";
import { EarlyLeaveRequestButton } from "@/components/absence-requests/early-leave-request-button";
import { LateArrivalRequestButton } from "@/components/absence-requests/late-arrival-request-button";
import { MyAbsenceRequests } from "@/components/absence-requests/my-absence-requests";
import { QUAL_TYPES } from "@/lib/constants";

export default async function MyRecordPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [attRes, drillAttRes, qualsRes, corrsRes, pipsRes, eventsRes, absenceRes, qtRes, nomRes, paperworkRes, inspRes] = await Promise.all([
    supabase
      .from("attendance")
      .select("*, events(title, start_time)")
      .eq("cadet_id", profile.id)
      .order("recorded_at", { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("drill_attendance") as any)
      .select("id, status, cadet_id, session_id, drill_sessions(date, submitted_at)")
      .eq("cadet_id", profile.id)
      .not("drill_sessions.submitted_at", "is", null),
    supabase.from("qualifications").select("*").eq("cadet_id", profile.id),
    supabase
      .from("corrections")
      .select("*")
      .eq("cadet_id", profile.id)
      .eq("status", "open"),
    supabase
      .from("pips")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("*, pip_tasks(*)" as any)
      .eq("cadet_id", profile.id)
      .in("status", ["open", "pending_ack"]),
    supabase
      .from("events")
      .select("*")
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .limit(5),
    supabase
      .from("absence_requests")
      .select("id, requested_date, request_type, reason, makeup_plan, departure_time, status, review_notes, created_at")
      .eq("cadet_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("qual_types").select("name").eq("active", true).order("sort_order"),
    supabase
      .from("billet_nominations")
      .select("id, billet_name, stage, created_at")
      .eq("cadet_id", profile.id)
      .not("stage", "in", '("not_selected","confirmed")')
      .order("created_at", { ascending: false }),
    supabase
      .from("document_submissions" as never)
      .select("id, document_type_id, expiry_date, status, submitted_at, document_types(name)")
      .eq("cadet_id", profile.id)
      .order("submitted_at", { ascending: false })
      .limit(20),
    supabase
      .from("uniform_inspection_results")
      .select("passed, scores, created_at, uniform_inspection_sessions(date)")
      .eq("cadet_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const qualTypes = qtRes.data && qtRes.data.length > 0 ? (qtRes.data as { name: string }[]).map((q) => q.name) : QUAL_TYPES;

  // Merge drill_attendance into the same shape as attendance so record pages show all records
  type DrillAttRow = { id: string; status: string; cadet_id: string; session_id: string; drill_sessions: { date: string; submitted_at: string | null } | null };
  const drillRows: DrillAttRow[] = (drillAttRes?.data ?? []) as DrillAttRow[];
  const mergedAttendance = [
    ...(attRes.data ?? []),
    ...drillRows
      .filter((r) => r.drill_sessions?.submitted_at)
      .map((r) => ({
        id: `drill-${r.id}`,
        cadet_id: r.cadet_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: r.status as any,
        locked: true,
        recorded_at: r.drill_sessions!.date,
        event_id: null,
        events: { title: "Drill", start_time: r.drill_sessions!.date + "T12:00:00" },
      })),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ].sort((a, b) => new Date(((b as any).recorded_at) ?? 0).getTime() - new Date(((a as any).recorded_at) ?? 0).getTime());

  return (
    <div className="space-y-6">
      {/* Absence request section — shown for all members except parents */}
      {profile.role !== "parent" && (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Absence Requests</p>
              <p className="text-xs text-gray-400">
                {((absenceRes.data ?? []) as { status: string }[]).filter((r) => r.status === "pending").length} pending ·{" "}
                {((absenceRes.data ?? []) as { status: string }[]).filter((r) => r.status === "approved").length} approved
              </p>
            </div>
            <div className="flex items-center gap-2">
              <AbsenceRequestButton profile={profile} />
              <EarlyLeaveRequestButton profile={profile} />
              <LateArrivalRequestButton profile={profile} />
            </div>
          </div>
          {(absenceRes.data ?? []).length > 0 && (
            <div className="p-4">
              <MyAbsenceRequests requests={(absenceRes.data ?? []) as never} />
            </div>
          )}
        </div>
      )}

      <MyRecordClient
        profile={profile}
        attendance={mergedAttendance as never}
        quals={(qualsRes.data ?? []) as never}
        openCorrections={(corrsRes.data ?? []) as never}
        openPips={(pipsRes.data ?? []) as never}
        upcomingEvents={eventsRes.data ?? []}
        qualTypes={qualTypes}
        activeNominations={(nomRes.data ?? []) as never}
        paperwork={(paperworkRes.data ?? []) as never}
        inspectionHistory={(inspRes.data ?? []) as never}
      />
    </div>
  );
}
