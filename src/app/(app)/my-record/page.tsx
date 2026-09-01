import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { MyRecordClient } from "@/components/my-record/my-record-client";

export default async function MyRecordPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [attRes, qualsRes, corrsRes, pipsRes, eventsRes] = await Promise.all([
    supabase
      .from("attendance")
      .select("*, events(title, start_time)")
      .eq("cadet_id", profile.id)
      .order("recorded_at", { ascending: false }),
    supabase.from("qualifications").select("*").eq("cadet_id", profile.id),
    supabase
      .from("corrections")
      .select("*")
      .eq("cadet_id", profile.id)
      .eq("status", "open"),
    supabase
      .from("pips")
      .select("*")
      .eq("cadet_id", profile.id)
      .eq("status", "open"),
    supabase
      .from("events")
      .select("*")
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .limit(5),
  ]);

  return (
    <MyRecordClient
      profile={profile}
      attendance={(attRes.data ?? []) as never}
      quals={qualsRes.data ?? []}
      openCorrections={(corrsRes.data ?? []) as never}
      openPips={(pipsRes.data ?? []) as never}
      upcomingEvents={eventsRes.data ?? []}
    />
  );
}
