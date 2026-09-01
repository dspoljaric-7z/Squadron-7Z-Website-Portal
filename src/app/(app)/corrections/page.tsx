import { requireProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import { canViewCorrections } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { CorrectionsClient } from "@/components/corrections/corrections-client";

export default async function CorrectionsPage() {
  const profile = await requireProfile();
  if (!canViewCorrections(profile)) redirect("/dashboard");

  const supabase = await createClient();
  const [correctionsRes, pipsRes, cadetsRes] = await Promise.all([
    supabase
      .from("corrections")
      .select("*, cadet:profiles!corrections_cadet_id_fkey(id, full_name, rank), issuer:profiles!corrections_issued_by_fkey(full_name), approver:profiles!corrections_approved_by_fkey(full_name), corrective_actions(*)")
      .order("issued_at", { ascending: false }),
    supabase
      .from("pips")
      .select("*, cadet:profiles!pips_cadet_id_fkey(id, full_name, rank), supervisor:profiles!pips_supervisor_id_fkey(full_name)")
      .order("opened_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, rank")
      .eq("active", true)
      .eq("approved", true)
      .in("role", ["cadet", "nco", "snco", "officer"])
      .order("full_name"),
  ]);

  return (
    <CorrectionsClient
      initialCorrections={(correctionsRes.data ?? []) as never}
      initialPips={(pipsRes.data ?? []) as never}
      cadets={(cadetsRes.data ?? []) as never}
      profile={profile}
    />
  );
}
