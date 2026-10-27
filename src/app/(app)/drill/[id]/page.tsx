import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { isStaff, isDivisionLeader } from "@/lib/permissions";
import { DrillRollCall } from "@/components/drill/drill-roll-call";
import { AbsenceRequestsPanel } from "@/components/absence-requests/absence-requests-panel";

export default async function DrillSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  if (!isStaff(profile) && !isDivisionLeader(profile)) redirect("/dashboard");

  const supabase = await createClient();

  // Division leaders only see their own division's cadets
  const divLeader = !isStaff(profile) && isDivisionLeader(profile);

  const [sessionRes, cadetsRes, attendanceRes, visitorsRes, divisionsRes] = await Promise.all([
    supabase.from("drill_sessions").select("*").eq("id", id).single(),
    (() => {
      const q = supabase
        .from("profiles")
        .select("id, full_name, rank, billet, division_id, role")
        .eq("active", true)
        .eq("approved", true)
        .in("role", ["cadet", "nco", "snco", "officer"])
        .order("full_name");
      return divLeader && profile.division_id
        ? q.eq("division_id", profile.division_id)
        : q;
    })(),
    supabase.from("drill_attendance").select("*").eq("session_id", id),
    supabase.from("drill_visitors").select("*").eq("session_id", id).order("created_at"),
    supabase.from("divisions").select("id, name").order("name"),
  ]);

  if (!sessionRes.data) notFound();
  const session = sessionRes.data;

  // Fetch POD for this session's date + watch bill assignments
  const [podRes, watchBillRes, absenceRes, linkedEventRes] = await Promise.all([
    supabase.from("plan_of_day").select("*").eq("date", session.date).maybeSingle(),
    supabase
      .from("watch_bills")
      .select("*, profiles(id, full_name, rank)")
      .eq("session_id", id),
    (isStaff(profile) || isDivisionLeader(profile))
      ? supabase
          .from("absence_requests")
          .select("id, cadet_id, requested_date, request_type, reason, makeup_plan, departure_time, status, review_notes, created_at, cadet:profiles!absence_requests_cadet_id_fkey(full_name, rank)")
          .eq("requested_date", session.date)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase
      .from("events")
      .select("id")
      .gte("start_time", `${session.date}T00:00:00`)
      .lt("start_time", `${session.date}T23:59:59`)
      .eq("event_type", "drill")
      .limit(1)
      .maybeSingle(),
  ]);

  const rsvpRes = linkedEventRes.data
    ? await supabase
        .from("event_rsvps")
        .select("profile_id, status")
        .eq("event_id", linkedEventRes.data.id)
    : { data: [] };

  return (
    <div className="space-y-4">
      {(isStaff(profile) || isDivisionLeader(profile)) && (absenceRes.data ?? []).length > 0 && (
        <div className="rounded-xl border bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-gray-900">Absence Requests for This Drill</p>
          <AbsenceRequestsPanel
            initialRequests={(absenceRes.data ?? []) as never}
            profile={profile}
            sessionId={id}
          />
        </div>
      )}
      <DrillRollCall
        session={session}
        cadets={cadetsRes.data ?? []}
        initialAttendance={attendanceRes.data ?? []}
        initialVisitors={visitorsRes.data ?? []}
        profile={profile}
        pod={podRes.data ?? null}
        initialWatchBill={(watchBillRes.data ?? []) as never}
        initialRsvps={(rsvpRes.data ?? []) as { profile_id: string; status: string }[]}
        divisions={divisionsRes.data ?? []}
        absenceRequests={(absenceRes.data ?? []) as never}
      />
    </div>
  );
}
