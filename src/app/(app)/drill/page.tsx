import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isStaff } from "@/lib/permissions";
import { DrillSessionList } from "@/components/drill/drill-session-list";

export default async function DrillPage() {
  const profile = await requireProfile();
  if (!isStaff(profile)) redirect("/dashboard");

  const supabase = await createClient();
  const [sessionsRes, profilesRes] = await Promise.all([
    supabase
      .from("drill_sessions")
      .select("*, maa:profiles!drill_sessions_maa_id_fkey(full_name), recorder:profiles!drill_sessions_recorded_by_fkey(full_name)")
      .order("date", { ascending: false })
      .limit(30),
    supabase
      .from("profiles")
      .select("id, full_name, rank")
      .eq("active", true)
      .eq("approved", true)
      .in("role", ["officer", "snco", "nco"])
      .order("full_name"),
  ]);

  return (
    <DrillSessionList
      initialSessions={(sessionsRes.data ?? []) as never}
      officers={profilesRes.data ?? []}
      profile={profile}
    />
  );
}
