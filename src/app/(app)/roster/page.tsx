import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { RosterClient } from "@/components/roster/roster-client";
import { QUAL_TYPES } from "@/lib/constants";
import { byLastName } from "@/lib/format";
import { isStaff } from "@/lib/permissions";

export default async function RosterPage() {
  const profile = await requireProfile();
  const staffViewer = isStaff(profile);

  const supabase = await createClient();
  // Non-staff cadets see a reduced set — no email, date_of_rank, or join_date (PII)
  const selectFields = staffViewer
    ? "id, full_name, rank, role, billet, billet_2, billet_3, join_date, date_of_rank, division_id, email, active, approved, is_command, is_maa"
    : "id, full_name, rank, role, billet, billet_2, billet_3, division_id, active, approved, is_command, is_maa";
  const [{ data }, qtRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(selectFields)
      .neq("role", "parent")
      .or(`active.eq.true,id.eq.${profile.id}`)
      .or(`approved.eq.true,id.eq.${profile.id}`)
      .order("full_name", { ascending: true }),
    supabase.from("qual_types").select("name").eq("active", true).order("sort_order"),
  ]);

  const qualTypes = qtRes.data && qtRes.data.length > 0 ? (qtRes.data as { name: string }[]).map((q) => q.name) : QUAL_TYPES;

  return <RosterClient cadets={((data ?? []) as unknown as { full_name: string }[]).sort(byLastName) as never} profile={profile} qualTypes={qualTypes} />;
}
