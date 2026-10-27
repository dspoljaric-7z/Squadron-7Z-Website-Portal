import { requireProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSeniorStaff } from "@/lib/permissions";
import { PaperworkClient } from "@/components/paperwork/paperwork-client";

export default async function PaperworkPage() {
  const profile = await requireProfile();
  if (!isSeniorStaff(profile) && !profile.is_yeoman) redirect("/dashboard");

  const supabase = await createClient();

  const [profilesRes, paperworkRes, docTypesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, rank, role")
      .eq("active", true)
      .eq("approved", true)
      .in("role", ["cadet", "nco", "snco", "officer"])
      .order("full_name"),
    supabase.from("cadet_paperwork").select("*"),
    supabase.from("paperwork_doc_types" as never).select("*").eq("active", true).order("sort_order"),
  ]);

  const canManageTypes = profile.role === "officer" || profile.is_command;

  return (
    <PaperworkClient
      profiles={profilesRes.data ?? []}
      initialPaperwork={(paperworkRes.data ?? []) as never}
      docTypes={(docTypesRes.data ?? []) as never}
      canManageTypes={canManageTypes}
    />
  );
}
