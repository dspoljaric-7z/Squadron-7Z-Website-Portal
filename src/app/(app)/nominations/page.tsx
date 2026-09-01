import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isSeniorStaff } from "@/lib/permissions";
import { NominationsClient } from "@/components/nominations/nominations-client";

export default async function NominationsPage() {
  const profile = await requireProfile();
  if (!isSeniorStaff(profile)) redirect("/dashboard");

  const supabase = await createClient();
  const [nominationsRes, cadetsRes, billetsRes] = await Promise.all([
    supabase
      .from("billet_nominations")
      .select("*, cadet:profiles!billet_nominations_cadet_id_fkey(full_name, rank), nominator:profiles!billet_nominations_nominated_by_fkey(full_name), approver:profiles!billet_nominations_approved_by_fkey(full_name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, rank")
      .eq("active", true)
      .eq("approved", true)
      .in("role", ["cadet", "nco", "snco", "officer"])
      .order("full_name"),
    supabase.from("billets").select("id, name").eq("active", true).order("sort_order"),
  ]);

  return (
    <NominationsClient
      initialNominations={(nominationsRes.data ?? []) as never}
      cadets={cadetsRes.data ?? []}
      billets={billetsRes.data ?? []}
      profile={profile}
    />
  );
}
