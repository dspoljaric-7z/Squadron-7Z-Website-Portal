import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isSeniorStaff } from "@/lib/permissions";
import { TswCalendarClient } from "@/components/tsw-calendar/tsw-calendar-client";

export default async function TswCalendarPage() {
  const profile = await requireProfile();
  if (!isSeniorStaff(profile)) redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("tsw_calendar")
    .select("*")
    .order("date", { ascending: true });

  return <TswCalendarClient initialEntries={data ?? []} profile={profile} />;
}
