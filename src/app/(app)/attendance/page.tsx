import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { AttendanceClient } from "@/components/attendance/attendance-client";
import { redirect } from "next/navigation";
import { isStaff } from "@/lib/permissions";

export default async function AttendancePage() {
  const profile = await requireProfile();
  if (!isStaff(profile)) redirect("/dashboard");

  const supabase = await createClient();
  const [eventsRes, membersRes] = await Promise.all([
    supabase.from("events").select("*").order("start_time", { ascending: false }),
    supabase
      .from("profiles")
      .select("*")
      .eq("active", true)
      .in("role", ["officer", "snco", "nco", "cadet"])
      .order("full_name"),
  ]);

  return (
    <AttendanceClient
      profile={profile}
      events={eventsRes.data ?? []}
      members={membersRes.data ?? []}
    />
  );
}
