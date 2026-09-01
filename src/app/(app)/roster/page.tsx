import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { RosterClient } from "@/components/roster/roster-client";

export default async function RosterPage() {
  await requireProfile();

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
