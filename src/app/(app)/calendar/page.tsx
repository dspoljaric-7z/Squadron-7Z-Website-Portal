import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { CalendarClient } from "@/components/calendar/calendar-client";

export default async function CalendarPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: events }, { data: tswEntries }] = await Promise.all([
    supabase.from("events").select("*").order("start_time", { ascending: true }),
    supabase.from("tsw_calendar").select("*").order("date", { ascending: true }),
  ]);

  const canEdit = profile.role === "officer" || profile.role === "snco";

  return (
    <CalendarClient
      initialEvents={events ?? []}
      initialTswEntries={tswEntries ?? []}
      canEdit={canEdit}
      profileId={profile.id}
    />
  );
}
