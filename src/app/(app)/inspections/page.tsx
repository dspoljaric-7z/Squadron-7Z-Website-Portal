import { requireProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewInspections } from "@/lib/permissions";
import { InspectionsClient } from "@/components/inspections/inspections-client";

export default async function InspectionsPage() {
  const profile = await requireProfile();
  if (!canViewInspections(profile)) redirect("/dashboard");

  const supabase = await createClient();

  const [sessionsRes, profilesRes, drillsRes, itemsRes] = await Promise.all([
    supabase
      .from("uniform_inspection_sessions")
      .select("*")
      .order("date", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("id, full_name, rank, role")
      .eq("active", true)
      .eq("approved", true)
      .in("role", ["cadet", "nco", "snco", "officer"])
      .order("full_name"),
    supabase
      .from("drill_sessions")
      .select("id, date")
      .order("date", { ascending: false })
      .limit(20),
    supabase
      .from("inspection_item_defs" as never)
      .select("*")
      .eq("active", true)
      .order("sort_order"),
  ]);

  const canManageItems = profile.role === "officer" || profile.is_maa || profile.is_command;

  return (
    <InspectionsClient
      currentProfile={profile}
      initialSessions={(sessionsRes.data ?? []) as never}
      allProfiles={profilesRes.data ?? []}
      recentDrills={(drillsRes.data ?? []) as never}
      inspectionItems={(itemsRes.data ?? []) as never}
      canManageItems={canManageItems}
    />
  );
}
