import { requireProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import { isCommand } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { AccessClient } from "@/components/access/access-client";

export default async function AccessPage() {
  const profile = await requireProfile();
  if (!isCommand(profile)) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: allowed }, { data: profiles }] = await Promise.all([
    supabase.from("allowed_emails").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email, role, is_command, is_maa, active, approved").order("full_name"),
  ]);

  return (
    <AccessClient
      initialAllowed={(allowed ?? []) as never}
      profiles={(profiles ?? []) as never}
      currentProfile={profile}
    />
  );
}
