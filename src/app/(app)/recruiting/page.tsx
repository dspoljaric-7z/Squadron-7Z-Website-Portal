import { requireProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import { isSeniorStaff } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { RecruitingClient } from "@/components/recruiting/recruiting-client";

export default async function RecruitingPage() {
  const profile = await requireProfile();
  if (!isSeniorStaff(profile)) redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("recruiting_prospects")
    .select("*, assigned:profiles!recruiting_prospects_assigned_to_fkey(full_name)")
    .order("updated_at", { ascending: false });

  return <RecruitingClient initialProspects={(data ?? []) as never} profile={profile} />;
}
