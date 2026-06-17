import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { PodClient } from "@/components/pod/pod-client";

export default async function PodPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];

  const [podRes, profilesRes, templatesRes, settingsRes, allDatesRes] = await Promise.all([
    supabase.from("plan_of_day").select("*").eq("date", today).maybeSingle(),
    supabase
      .from("profiles")
      .select("id, full_name, rank, role")
      .eq("active", true)
      .eq("approved", true)
      .in("role", ["cadet", "nco", "snco", "officer"])
      .order("full_name"),
    supabase.from("pod_templates").select("*").order("name"),
    supabase.from("site_settings").select("unit_name, motto").eq("id", 1).single(),
    supabase.from("plan_of_day").select("date").order("date", { ascending: true }),
  ]);

  const allDates = (allDatesRes.data ?? []).map((r) => r.date);

  // Default to most recent drill day if today has no POD
  let initialDate = today;
  let initialPod = podRes.data ?? null;
  if (!initialPod && allDates.length > 0) {
    initialDate = allDates[allDates.length - 1];
    const { data } = await supabase
      .from("plan_of_day")
      .select("*")
      .eq("date", initialDate)
      .maybeSingle();
    initialPod = data ?? null;
  }

  const canEdit = profile.role === "officer" || profile.role === "snco";

  return (
    <PodClient
      initialPod={initialPod}
      initialDate={initialDate}
      canEdit={canEdit}
      allProfiles={profilesRes.data ?? []}
      initialTemplates={templatesRes.data ?? []}
      unitName={settingsRes.data?.unit_name ?? "Squadron 7-Zulu"}
      motto={settingsRes.data?.motto ?? "Honor, Courage, Commitment, Service"}
      initialAllDates={allDates}
    />
  );
}
