import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { isStaff } from "@/lib/permissions";
import { ReportCardClient } from "@/components/cadets/report-card-client";

export default async function CadetReportCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireProfile();

  if (!isStaff(viewer) && viewer.id !== id) notFound();

  const supabase = await createClient();

  const [
    { data: cadet },
    { data: attendance },
    { data: inspectionResults },
    { data: quals },
    { data: qualTypes },
    { data: corrections },
    { data: billet },
    { data: paperwork },
    { data: checklists },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.from("attendance").select("status, recorded_at, events(title)").eq("cadet_id", id),
    supabase
      .from("uniform_inspection_results")
      .select("passed, scores, created_at, inspection_session_id, uniform_inspection_sessions(date)")
      .eq("cadet_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("qualifications").select("status").eq("cadet_id", id),
    supabase.from("qual_types").select("name").eq("active", true),
    supabase.from("corrections").select("status").eq("cadet_id", id),
    supabase.from("billets").select("name").eq("assigned_to", id).eq("active", true).maybeSingle(),
    supabase
      .from("document_submissions" as never)
      .select("document_type_id, expiry_date, status")
      .eq("cadet_id", id)
      .eq("status", "collected"),
    supabase
      .from("cadet_checklists" as never)
      .select("type, step, completed")
      .eq("cadet_id", id),
  ]);

  if (!cadet) notFound();

  return (
    <ReportCardClient
      cadet={cadet as never}
      attendance={(attendance ?? []) as never}
      inspectionResults={(inspectionResults ?? []) as never}
      quals={(quals ?? []) as never}
      qualTypes={(qualTypes ?? []).map((q: { name: string }) => q.name)}
      corrections={(corrections ?? []) as never}
      billet={billet as never}
      paperwork={(paperwork ?? []) as never}
      checklists={(checklists ?? []) as never}
    />
  );
}
