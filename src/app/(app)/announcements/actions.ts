"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/profile";

export async function markAnnouncementsRead(announcementIds: string[]) {
  if (!announcementIds.length) return;
  const profile = await requireProfile();
  const supabase = await createClient();

  const rows = announcementIds.map((aid) => ({
    profile_id: profile.id,
    announcement_id: aid,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("announcement_reads")
    .upsert(rows, { onConflict: "profile_id,announcement_id", ignoreDuplicates: true });
}
