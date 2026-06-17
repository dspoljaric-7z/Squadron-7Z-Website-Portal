import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { ChainOfCommandClient } from "@/components/chain-of-command/chain-of-command-client";

export default async function ChainOfCommandPage() {
  await requireProfile();
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
      .select("id, full_name, rank, role, billet")
      .eq("active", true)
      .eq("approved", true)
      .in("role", ["officer", "snco", "nco", "cadet"]),
  ]);

  return (
    <ChainOfCommandClient
      billets={billetsRes.data ?? []}
      profiles={profilesRes.data ?? []}
    />
  );
}
