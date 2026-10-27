import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { isSeniorStaff } from "@/lib/permissions";
import { RecruitingClient } from "@/components/recruiting/recruiting-client";

export default async function RecruitingPage() {
  const profile = await requireProfile();
  if (!isSeniorStaff(profile)) redirect("/dashboard");

  const supabase = await createClient();
  const admin = createAdminClient();

  // Auto-backfill: find drill visitors with no prospect_id and create prospects for them
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: unlinked } = await (supabase.from("drill_visitors") as any)
    .select("id, name, unit, guardian_contact, notes, session_id, drill_sessions!inner(date)")
    .is("prospect_id", null)
    .not("name", "is", null);

  if (unlinked?.length) {
    for (const v of unlinked as { id: string; name: string; unit: string | null; guardian_contact: string | null; notes: string | null; drill_sessions: { date: string } }[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newProspect } = await (admin.from("prospects") as any)
        .insert({
          name: v.name,
          unit: v.unit ?? null,
          guardian_contact: v.guardian_contact ?? null,
          notes: v.notes ?? null,
          status: "visited",
          first_visit_date: v.drill_sessions?.date ?? new Date().toISOString().slice(0, 10),
          source: "drill_visit",
          created_by: profile.id,
        })
        .select("id").single();
      if (newProspect) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("drill_visitors") as any)
          .update({ prospect_id: (newProspect as { id: string }).id }).eq("id", v.id);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from("prospects") as any)
    .select("*, creator:profiles!prospects_created_by_fkey(full_name)")
    .order("updated_at", { ascending: false });

  return <RecruitingClient prospects={(data ?? []) as never} profile={profile} />;
}
