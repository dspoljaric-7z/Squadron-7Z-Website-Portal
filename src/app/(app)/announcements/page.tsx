import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementsClient } from "@/components/announcements/announcements-client";

export default async function AnnouncementsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*, profiles:posted_by(full_name, rank)")
    .order("created_at", { ascending: false });

  const canPost = profile.role === "officer" || profile.role === "snco" || profile.role === "nco";
  const canDelete = profile.role === "officer" || profile.role === "snco";

  return (
    <AnnouncementsClient
      profile={profile}
      initialAnnouncements={(announcements ?? []) as never}
      canPost={canPost}
      canDelete={canDelete}
    />
  );
}
