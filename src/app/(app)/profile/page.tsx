import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CadetProfileView } from "@/components/profile/cadet-profile-view";

export default async function MyProfilePage() {
  const viewer = await requireProfile();
  const supabase = await createClient();

  const targetId = viewer.id;

  if (viewer.role === "officer" || viewer.role === "snco" || viewer.role === "nco") redirect(`/cadets/${viewer.id}`);

  const [{ data: cadet }, { data: attendance }, drillAttRes, { data: boardResults }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", targetId).single(),
    supabase.from("attendance").select("*, events(title, start_time)").eq("cadet_id", targetId).order("recorded_at", { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("drill_attendance") as any)
      .select("id, status, cadet_id, session_id, drill_sessions(date, submitted_at)")
      .eq("cadet_id", targetId)
      .not("drill_sessions.submitted_at", "is", null),
    supabase.from("board_results").select("*").eq("cadet_id", targetId).order("board_date", { ascending: false }),
  ]);

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

  if (!cadet) {
    return (
      <div className="rounded-md border bg-white p-6 text-sm text-gray-500">
        Profile not found.
      </div>
    );
  }

  return (
    <CadetProfileView
      viewer={viewer}
      cadet={cadet}
      initialAttendance={mergedAttendance as never}
      initialNotes={[]}
      initialBoardResults={(boardResults ?? []) as never}
    />
  );
}
