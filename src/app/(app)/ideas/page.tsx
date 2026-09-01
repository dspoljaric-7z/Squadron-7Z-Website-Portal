import { requireProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import { isStaff } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { IdeasClient } from "@/components/ideas/ideas-client";

export default async function IdeasPage() {
  const profile = await requireProfile();
  if (!isStaff(profile)) redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_ideas")
    .select("*, submitter:profiles!activity_ideas_submitted_by_fkey(full_name)")
    .order("created_at", { ascending: false });

  return <IdeasClient initialIdeas={(data ?? []) as never} profile={profile} />;
}
