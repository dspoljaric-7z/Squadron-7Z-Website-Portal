import { requireProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import { canViewInspections } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { InspectionsClient } from "@/components/inspections/inspections-client";

export default async function InspectionsPage() {
  const profile = await requireProfile();
  if (!canViewInspections(profile)) redirect("/dashboard");

  const supabase = await createClient();
  const [sessionsRes, cadetsRes] = await Promise.all([
    supabase
      .from("uniform_inspection_sessions")
      .select("*, conductor:profiles!uniform_inspection_sessions_conducted_by_fkey(full_name), uniform_inspection_results(*)")
      .order("date", { ascending: false })
      .limit(20),
    supabase
      .from("profiles")
      .select("id, full_name, rank, billet, division_id")
      .eq("active", true)
      .eq("approved", true)
      .in("role", ["cadet", "nco", "snco", "officer"])
      .order("full_name"),
  ]);

  return (
    <InspectionsClient
      initialSessions={(sessionsRes.data ?? []) as never}
      cadets={cadetsRes.data ?? []}
      profile={profile}
    />
  );
}
