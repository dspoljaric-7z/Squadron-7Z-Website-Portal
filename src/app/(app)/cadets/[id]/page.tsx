import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { isStaff } from "@/lib/permissions";
import { CadetProfileView } from "@/components/profile/cadet-profile-view";

export default async function CadetProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireProfile();

  const isOwner = viewer.id === id;
  if (!isStaff(viewer) && !isOwner) {
    notFound();
  }

  const supabase = await createClient();

  const [
    { data: cadet },
    { data: attendance },
    drillAttRes,
    { data: notes },
    { data: boardResults },
    { data: inspectionResults },
    { data: quals },
    { data: qualTypes },
    pipsResult,
    docsResult,
    checklistResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.from("attendance").select("*, events(title, start_time)").eq("cadet_id", id).order("recorded_at", { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("drill_attendance") as any)
      .select("id, status, cadet_id, session_id, drill_sessions(date, submitted_at)")
      .eq("cadet_id", id)
      .not("drill_sessions.submitted_at", "is", null),
    isStaff(viewer)
      ? supabase.from("staff_notes").select("*, profiles:posted_by(full_name, rank)").eq("cadet_id", id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from("board_results").select("*").eq("cadet_id", id).order("board_date", { ascending: false }),
    isStaff(viewer)
      ? supabase.from("uniform_inspection_results").select("*, uniform_inspection_sessions(date, notes)").eq("cadet_id", id).order("created_at", { ascending: false }).limit(20)
      : Promise.resolve({ data: [] }),
    supabase.from("qualifications").select("qual_type_id, status, completed_at").eq("cadet_id", id),
    supabase.from("qual_types").select("id, name, sort_order").eq("active", true).order("sort_order"),
    isStaff(viewer)
      ? supabase.from("pips").select("*, supervisor:profiles!pips_supervisor_id_fkey(full_name, rank)").eq("cadet_id", id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    isStaff(viewer)
      ? supabase.from("document_submissions" as never).select("*, document_types:document_type_id(name, frequency)").eq("cadet_id", id).order("collected_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from("cadet_checklists" as never)
      .select("id, cadet_id, type, step, completed, completed_at, completed_by, notes")
      .eq("cadet_id", id),
  ]);

  if (!cadet) notFound();

  type DrillAttRow = { id: string; status: string; cadet_id: string; session_id: string; drill_sessions: { date: string; submitted_at: string | null } | null };
  const drillRows: DrillAttRow[] = (drillAttRes?.data ?? []) as DrillAttRow[];
  const mergedAttendance = [
    ...(attendance ?? []),
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
    <CadetProfileView
      viewer={viewer}
      cadet={cadet}
      initialAttendance={mergedAttendance as never}
      initialNotes={(notes ?? []) as never}
      initialBoardResults={(boardResults ?? []) as never}
      initialInspectionResults={(inspectionResults ?? []) as never}
      initialQuals={(quals ?? []) as never}
      qualTypes={(qualTypes ?? []) as never}
      initialPips={(pipsResult.data ?? []) as never}
      initialDocs={(docsResult.data ?? []) as never}
      initialChecklists={(checklistResult.data ?? []) as never}
      canEditChecklist={isStaff(viewer) || viewer.is_yeoman === true}
    />
  );
}
