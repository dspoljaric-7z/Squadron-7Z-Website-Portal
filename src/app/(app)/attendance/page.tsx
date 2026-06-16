import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { AttendanceClient } from "@/components/attendance/attendance-client";
import { redirect } from "next/navigation";

export default async function AttendancePage() {
  const profile = await requireProfile();
  if (profile.role !== "officer" && profile.role !== "nco") redirect("/dashboard");

  const supabase = await createClient();
  const [eventsRes, cadetsRes] = await Promise.all([
    supabase.from("events").select("*").order("start_time", { ascending: false }),
    supabase.from("profiles").select("*").eq("role", "cadet").eq("active", true).order("full_name"),
  ]);

  return (
    <AttendanceClient
      profile={profile}
      events={eventsRes.data ?? []}
      cadets={cadetsRes.data ?? []}
    />
  );
}
