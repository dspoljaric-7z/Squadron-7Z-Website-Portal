import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { CalendarClient } from "@/components/calendar/calendar-client";

export default async function CalendarPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("start_time", { ascending: true });

  const canEdit = profile.role === "officer" || profile.role === "snco";

  return <CalendarClient initialEvents={events ?? []} canEdit={canEdit} profileId={profile.id} />;
}
