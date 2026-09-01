import { requireProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import { canViewCorrections } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { OtherIssuesClient } from "@/components/other-issues/other-issues-client";

export default async function OtherIssuesPage() {
  const profile = await requireProfile();
  if (!canViewCorrections(profile)) redirect("/dashboard");

  const supabase = await createClient();
  const [issuesRes, cadetsRes] = await Promise.all([
    supabase
      .from("other_issues")
      .select("*, cadet:profiles!other_issues_cadet_id_fkey(full_name, rank), reporter:profiles!other_issues_reported_by_fkey(full_name)")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, rank").eq("active", true).eq("approved", true).in("role", ["cadet", "nco", "snco", "officer"]).order("full_name"),
  ]);

  return (
    <OtherIssuesClient
      initialIssues={(issuesRes.data ?? []) as never}
      cadets={cadetsRes.data ?? []}
      profile={profile}
    />
  );
}
