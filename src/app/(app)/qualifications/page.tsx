import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/permissions";
import { QualificationsClient } from "@/components/qualifications/qualifications-client";
import { MyRecordClient } from "@/components/my-record/my-record-client";
import { QUAL_TYPES } from "@/lib/constants";

type QualTypeDetail = { name: string; prerequisites: string[] };

async function fetchQualTypeDetails(supabase: Awaited<ReturnType<typeof createClient>>): Promise<QualTypeDetail[]> {
  const { data } = await supabase.from("qual_types").select("name, prerequisites").eq("active", true).order("sort_order");
  if (data && data.length > 0) {
    return (data as { name: string; prerequisites: string[] | null }[]).map((q) => ({
      name: q.name,
      prerequisites: q.prerequisites ?? [],
    }));
  }
  return QUAL_TYPES.map((name) => ({ name, prerequisites: [] }));
}

export default async function QualificationsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  // Cadets see their own record; staff see all cadets
  if (!isStaff(profile)) {
    const [attRes, qualsRes, corrsRes, pipsRes, eventsRes, qualTypeDetails] = await Promise.all([
      supabase
        .from("attendance")
        .select("*, events(title, start_time)")
        .eq("cadet_id", profile.id)
        .order("recorded_at", { ascending: false }),
      supabase.from("qualifications").select("*").eq("cadet_id", profile.id),
      supabase.from("corrections").select("*").eq("cadet_id", profile.id).eq("status", "open"),
      supabase.from("pips").select("*").eq("cadet_id", profile.id).eq("status", "open"),
      supabase
        .from("events")
        .select("*")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(5),
      fetchQualTypeDetails(supabase),
    ]);
    return (
      <MyRecordClient
        profile={profile}
        attendance={(attRes.data ?? []) as never}
        quals={qualsRes.data ?? []}
        openCorrections={(corrsRes.data ?? []) as never}
        openPips={(pipsRes.data ?? []) as never}
        upcomingEvents={eventsRes.data ?? []}
        qualTypes={qualTypeDetails.map((q) => q.name)}
      />
    );
  }

  const [cadetsRes, qualsRes, qualTypeDetails] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, rank, billet, division_id, role")
      .eq("active", true)
      .eq("approved", true)
      .in("role", ["cadet", "nco", "snco"])
      .order("full_name"),
    supabase.from("qualifications").select("*"),
    fetchQualTypeDetails(supabase),
  ]);

  return (
    <QualificationsClient
      cadets={cadetsRes.data ?? []}
      initialQuals={qualsRes.data ?? []}
      profile={profile}
      qualTypes={qualTypeDetails.map((q) => q.name)}
      qualTypeDetails={qualTypeDetails}
    />
  );
}
