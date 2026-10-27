import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/permissions";
import { OnboardingClient } from "@/components/onboarding/onboarding-client";

export default async function OnboardingPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [stepsRes, progressRes] = await Promise.all([
    supabase
      .from("onboarding_steps" as never)
      .select("*")
      .eq("active", true)
      .order("sort_order"),
    // For staff, fetch all cadets' progress; for cadet, fetch own
    isStaff(profile)
      ? supabase
          .from("cadet_onboarding" as never)
          .select("*, cadet:profiles!cadet_onboarding_cadet_id_fkey(id, full_name, rank, role)")
      : supabase
          .from("cadet_onboarding" as never)
          .select("*")
          .eq("cadet_id", profile.id),
  ]);

  const steps = (stepsRes.data ?? []) as { id: string; title: string; description: string | null; sort_order: number; required: boolean }[];

  if (steps.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <h1 className="text-2xl font-extrabold text-[#003087]">Onboarding</h1>
        <div className="rounded-xl border border-dashed p-10 text-center text-gray-400">
          <p className="text-sm font-medium">No onboarding steps configured yet.</p>
          {isStaff(profile) && (
            <p className="mt-1 text-xs">Run the SQL migration (0014_onboarding.sql) to seed the default steps.</p>
          )}
        </div>
      </div>
    );
  }

  // For a cadet, fetch their own cadets list (just themselves)
  let cadetsList: { id: string; full_name: string; rank: string | null; role: string }[] = [];
  if (isStaff(profile)) {
    const { data: cadets } = await supabase
      .from("profiles")
      .select("id, full_name, rank, role")
      .eq("active", true)
      .eq("approved", true)
      .eq("role", "cadet")
      .order("full_name");
    cadetsList = (cadets ?? []) as typeof cadetsList;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-[#003087]">
          {isStaff(profile) ? "Cadet Onboarding" : "My Onboarding Checklist"}
        </h1>
        <p className="text-sm text-gray-500">
          {isStaff(profile)
            ? "Track new cadet onboarding progress across the squadron."
            : "Complete these steps to finish joining Squadron 7-Zulu."}
        </p>
      </div>
      <OnboardingClient
        steps={steps}
        progress={(progressRes.data ?? []) as never}
        profile={profile}
        isStaff={isStaff(profile)}
        cadets={cadetsList}
      />
    </div>
  );
}
