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

  const [{ data: cadet }, { data: attendance }, { data: notes }, { data: boardResults }, { data: inspectionResults }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.from("attendance").select("*, events(title, start_time)").eq("cadet_id", id).order("recorded_at", { ascending: false }),
    isStaff(viewer)
      ? supabase.from("staff_notes").select("*, profiles:posted_by(full_name, rank)").eq("cadet_id", id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from("board_results").select("*").eq("cadet_id", id).order("board_date", { ascending: false }),
    isStaff(viewer)
      ? supabase.from("uniform_inspection_results").select("*, uniform_inspection_sessions(date, notes)").eq("cadet_id", id).order("created_at", { ascending: false }).limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  if (!cadet) notFound();

  return (
    <CadetProfileView
      viewer={viewer}
      cadet={cadet}
      initialAttendance={(attendance ?? []) as never}
      initialNotes={(notes ?? []) as never}
      initialBoardResults={(boardResults ?? []) as never}
      initialInspectionResults={(inspectionResults ?? []) as never}
    />
  );
}
