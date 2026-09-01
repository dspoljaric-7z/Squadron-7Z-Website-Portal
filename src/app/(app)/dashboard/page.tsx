import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { isStaff, isSeniorStaff, isCommand } from "@/lib/permissions";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];
  const staff = isStaff(profile);
  const seniorStaff = isSeniorStaff(profile);
  const command = isCommand(profile);

  const [eventsRes, announcementsRes, pendingRes, memberCountRes, podRes] =
    await Promise.all([
      supabase
        .from("events")
        .select("*")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(6),
      supabase
        .from("announcements")
        .select("*, profiles:posted_by(full_name, rank)")
        .order("created_at", { ascending: false })
        .limit(6),
      staff
        ? supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("approved", false)
        : Promise.resolve({ count: 0 } as { count: number | null }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("active", true)
        .eq("approved", true),
      supabase.from("plan_of_day").select("*").eq("date", today).maybeSingle(),
    ]);

  const [correctionsRes, nominationsRes, pipsRes] = await Promise.all([
    command
      ? supabase.from("corrections").select("id", { count: "exact", head: true }).eq("status", "open")
      : Promise.resolve({ count: null } as { count: number | null }),
    seniorStaff
      ? supabase
          .from("billet_nominations")
          .select("id", { count: "exact", head: true })
          .not("stage", "in", '("confirmed","not_selected")')
      : Promise.resolve({ count: null } as { count: number | null }),
    command
      ? supabase.from("pips").select("id", { count: "exact", head: true }).eq("status", "open")
      : Promise.resolve({ count: null } as { count: number | null }),
  ]);

  // Personal stats — for all non-parent members viewing their own record
  let myAttendancePct = 0;
  let myAttendanceTotal = 0;
  let myQualsDone = 0;
  let myOpenCorrections = 0;

  if (profile.role !== "parent") {
    const [attRes, qualsRes, myCorrsRes] = await Promise.all([
      supabase.from("attendance").select("status").eq("cadet_id", profile.id),
      supabase
        .from("qualifications")
        .select("status")
        .eq("cadet_id", profile.id)
        .eq("status", "completed"),
      supabase
        .from("corrections")
        .select("id", { count: "exact", head: true })
        .eq("cadet_id", profile.id)
        .eq("status", "open"),
    ]);
    const att = attRes.data ?? [];
    myAttendanceTotal = att.length;
    const present = att.filter((a) => a.status === "present").length;
    myAttendancePct = myAttendanceTotal > 0 ? Math.round((present / myAttendanceTotal) * 100) : 0;
    myQualsDone = (qualsRes.data ?? []).length;
    myOpenCorrections = myCorrsRes.count ?? 0;
  }

  // Parent: fetch their linked cadet
  let linkedCadet = null;
  let cadetAttendance = null;
  if (profile.role === "parent" && profile.parent_of) {
    const [cadetRes, attendanceRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", profile.parent_of).single(),
      supabase
        .from("attendance")
        .select("*, events(title, start_time)")
        .eq("cadet_id", profile.parent_of)
        .order("recorded_at", { ascending: false })
        .limit(15),
    ]);
    linkedCadet = cadetRes.data ?? null;
    cadetAttendance = (attendanceRes.data ?? null) as never;
  }

  return (
    <DashboardClient
      profile={profile}
      initialEvents={eventsRes.data ?? []}
      initialAnnouncements={announcementsRes.data ?? []}
      initialPendingCount={pendingRes.count ?? 0}
      memberCount={memberCountRes.count ?? 0}
      todayPod={podRes.data ?? null}
      linkedCadet={linkedCadet}
      cadetAttendance={cadetAttendance}
      openCorrectionsCount={correctionsRes.count ?? undefined}
      activePipelinesCount={nominationsRes.count ?? undefined}
      openPipsCount={pipsRes.count ?? undefined}
      myAttendancePct={myAttendancePct}
      myAttendanceTotal={myAttendanceTotal}
      myQualsDone={myQualsDone}
      myOpenCorrections={myOpenCorrections}
    />
  );
}
