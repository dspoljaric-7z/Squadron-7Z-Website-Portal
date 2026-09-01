import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isStaff } from "@/lib/permissions";
import { CadetLookupClient } from "@/components/cadet-lookup/cadet-lookup-client";

export default async function CadetLookupPage() {
  const profile = await requireProfile();
  if (!isStaff(profile)) redirect("/dashboard");

  const supabase = await createClient();
  const cadetsRes = await supabase
    .from("profiles")
    .select("id, full_name, rank, billet, billet_2, billet_3, role, division_id, join_date, date_of_rank, active, approved, email")
    .in("role", ["cadet", "nco", "snco", "officer"])
    .order("full_name");

  return <CadetLookupClient cadets={cadetsRes.data ?? []} profile={profile} />;
}
