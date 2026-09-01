import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { RosterClient } from "@/components/roster/roster-client";

export default async function RosterPage() {
  const profile = await requireProfile();
  if (!isStaff(profile)) redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, rank, role, billet, billet_2, billet_3, join_date, is_command, is_maa")
    .eq("active", true)
    .eq("approved", true)
    .neq("role", "parent")
    .order("full_name", { ascending: true });

  return <RosterClient cadets={(data ?? []) as never} />;
}
