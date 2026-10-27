import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementsClient } from "@/components/announcements/announcements-client";
import { canPostAnnouncements, isSeniorStaff } from "@/lib/permissions";

export default async function AnnouncementsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  // Which audience buckets this role can see
  const audienceMap: Record<string, string[]> = {
    officer: ["all", "officers_sncOs", "ncos_plus"],
    snco:    ["all", "officers_sncOs", "ncos_plus"],
    nco:     ["all", "ncos_plus"],
    cadet:   ["all", "cadets_only"],
    parent:  ["all"],
  };
  const allowedAudiences = audienceMap[profile.role] ?? ["all"];

  const now = new Date().toISOString();
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*, profiles:posted_by(full_name, rank)")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .in("audience", allowedAudiences as any)
    .or(`expires_at.is.null,expires_at.gte.${now}`)
    .order("created_at", { ascending: false });

  const canPost = canPostAnnouncements(profile);
  const canDelete = isSeniorStaff(profile) || profile.is_ops === true;

  return (
    <AnnouncementsClient
      profile={profile}
      initialAnnouncements={(announcements ?? []) as never}
      canPost={canPost}
      canDelete={canDelete}
    />
  );
}
