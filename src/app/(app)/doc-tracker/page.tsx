import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { DocTrackerClient } from "@/components/doc-tracker/doc-tracker-client";
import { isStaff } from "@/lib/permissions";

export default async function DocTrackerPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [typesRes, submissionsRes, cadetsRes] = await Promise.all([
    supabase.from("document_types").select("*").eq("active", true).order("sort_order"),
    isStaff(profile)
      ? supabase.from("document_submissions").select("*, collected_by_profile:profiles!document_submissions_collected_by_fkey(full_name)").order("collected_at", { ascending: false })
      : supabase.from("document_submissions").select("*, collected_by_profile:profiles!document_submissions_collected_by_fkey(full_name)").eq("cadet_id", profile.id).order("collected_at", { ascending: false }),
    isStaff(profile)
      ? supabase.from("profiles").select("id, full_name, rank, division_id").eq("active", true).eq("approved", true).in("role", ["cadet", "nco", "snco"]).order("full_name")
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <DocTrackerClient
      profile={profile}
      docTypes={(typesRes.data ?? []) as never}
      submissions={(submissionsRes.data ?? []) as never}
      cadets={(cadetsRes.data ?? []) as never}
    />
  );
}
