import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { isStaff } from "@/lib/permissions";
import { DrillRollCall } from "@/components/drill/drill-roll-call";

export default async function DrillSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  if (!isStaff(profile)) redirect("/dashboard");

  const supabase = await createClient();
  const [sessionRes, cadetsRes, attendanceRes, visitorsRes] = await Promise.all([
    supabase.from("drill_sessions").select("*").eq("id", id).single(),
    supabase
      .from("profiles")
      .select("id, full_name, rank, billet, division_id, role")
      .eq("active", true)
      .eq("approved", true)
      .in("role", ["cadet", "nco", "snco", "officer"])
      .order("full_name"),
    supabase.from("drill_attendance").select("*").eq("session_id", id),
    supabase.from("drill_visitors").select("*").eq("session_id", id).order("created_at"),
  ]);

  if (!sessionRes.data) notFound();
  const session = sessionRes.data;

  // Fetch POD for this session's date + watch bill assignments
  const [podRes, watchBillRes] = await Promise.all([
    supabase.from("plan_of_day").select("*").eq("date", session.date).maybeSingle(),
    supabase
      .from("watch_bills")
      .select("*, profiles(id, full_name, rank)")
      .eq("session_id", id),
  ]);

  return (
    <DrillRollCall
      session={session}
      cadets={cadetsRes.data ?? []}
      initialAttendance={attendanceRes.data ?? []}
      initialVisitors={visitorsRes.data ?? []}
      profile={profile}
      pod={podRes.data ?? null}
      initialWatchBill={(watchBillRes.data ?? []) as never /* profiles join shape */}
    />
  );
}
