import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminClient } from "@/components/admin/admin-client";

export default async function AdminPage() {
  const profile = await requireProfile();
  if (profile.role !== "officer") redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: users }, { data: inviteCodes }, { data: settingsRows }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("invite_codes").select("*").order("created_at", { ascending: false }),
    supabase.from("site_settings").select("*").eq("id", 1),
  ]);

  return (
    <AdminClient
      profile={profile}
      initialUsers={users ?? []}
      initialInviteCodes={inviteCodes ?? []}
      initialSettings={settingsRows?.[0] ?? null}
    />
  );
}
