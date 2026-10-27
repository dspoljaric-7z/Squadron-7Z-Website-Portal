import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { isSeniorStaff } from "@/lib/permissions";
import { ProspectDetailClient } from "@/components/recruiting/prospect-detail-client";

export default async function ProspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  if (!isSeniorStaff(profile)) redirect("/dashboard");

  const supabase = await createClient();

  const [prospectRes, notesRes, checklistRes, visitsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("prospects") as any).select("*").eq("id", id).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("prospect_notes") as any)
      .select("*, author:profiles!prospect_notes_created_by_fkey(full_name, rank)")
      .eq("prospect_id", id).order("created_at", { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("prospect_checklist_items") as any)
      .select("*").eq("prospect_id", id).order("sort_order"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("drill_visitors") as any)
      .select("*, session:drill_sessions(date, locked)")
      .eq("prospect_id", id).order("created_at", { ascending: false }),
  ]);

  if (!prospectRes.data) notFound();

  return (
    <ProspectDetailClient
      prospect={prospectRes.data as never}
      initialNotes={(notesRes.data ?? []) as never}
      initialChecklist={(checklistRes.data ?? []) as never}
      drillVisits={(visitsRes.data ?? []) as never}
      profile={profile}
    />
  );
}
