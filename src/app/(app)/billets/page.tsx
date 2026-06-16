import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { BilletsClient } from "@/components/billets/billets-client";

export default async function BilletsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [billetsRes, profilesRes] = await Promise.all([
    supabase
      .from("billets")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, rank, role, avatar_url")
      .eq("active", true)
      .eq("approved", true)
      .in("role", ["cadet", "nco", "snco", "officer"])
      .order("full_name"),
  ]);

  return (
    <BilletsClient
      profile={profile}
      initialBillets={billetsRes.data ?? []}
      allProfiles={profilesRes.data ?? []}
    />
  );
}
