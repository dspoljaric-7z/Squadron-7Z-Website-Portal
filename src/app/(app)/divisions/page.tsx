import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DivisionsClient } from "@/components/divisions/divisions-client";

export default async function DivisionsPage() {
  const profile = await requireProfile();
  if (profile.role !== "officer" && profile.role !== "snco") redirect("/dashboard");

  const supabase = await createClient();
  const [divisionsRes, membersRes] = await Promise.all([
    supabase.from("divisions").select("*").order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, rank, role, division_id, avatar_url")
      .eq("active", true)
      .eq("approved", true)
      .in("role", ["cadet", "nco", "snco", "officer"])
      .order("full_name"),
  ]);

  return (
    <DivisionsClient
      profile={profile}
      initialDivisions={divisionsRes.data ?? []}
      members={membersRes.data ?? []}
    />
  );
}
