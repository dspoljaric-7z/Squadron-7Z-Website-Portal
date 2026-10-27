import { requireProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import { canManageDiscipline, isCommand } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { DisciplineClient } from "@/components/discipline/discipline-client";
import type { Profile } from "@/types/database";
import { byLastName } from "@/lib/format";

export default async function DisciplinePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const profile = await requireProfile();
  if (!canManageDiscipline(profile)) redirect("/dashboard");

  const params = await searchParams;
  const defaultTab = params.tab ?? "inspections";

  const supabase = await createClient();
  const [sessionsRes, correctionsRes, pipsRes, issuesRes, cadetsRes, staffRes] = await Promise.all([
    supabase
      .from("uniform_inspection_sessions")
      .select("*, conductor:profiles!uniform_inspection_sessions_conducted_by_fkey(full_name), uniform_inspection_results(*)")
      .order("date", { ascending: false })
      .limit(20),
    supabase
      .from("corrections")
      .select("*, cadet:profiles!corrections_cadet_id_fkey(id, full_name, rank), issuer:profiles!corrections_issued_by_fkey(full_name), approver:profiles!corrections_approved_by_fkey(full_name), corrective_actions(*)")
      .order("issued_at", { ascending: false }),
    supabase
      .from("pips")
      .select("*, cadet:profiles!pips_cadet_id_fkey(id, full_name, rank), supervisor:profiles!pips_supervisor_id_fkey(full_name)")
      .order("opened_at", { ascending: false }),
    isCommand(profile)
      ? supabase
          .from("other_issues")
          .select("*, cadet:profiles!other_issues_cadet_id_fkey(full_name, rank), reporter:profiles!other_issues_reported_by_fkey(full_name)")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from("profiles")
      .select("id, full_name, rank")
      .eq("active", true)
      .eq("approved", true)
      .in("role", ["cadet", "nco", "snco", "officer"])
      .order("full_name"),
    // Staff who can be PIP supervisors (NCO, SNCO, officers)
    supabase
      .from("profiles")
      .select("id, full_name, rank")
      .eq("active", true)
      .eq("approved", true)
      .in("role", ["nco", "snco", "officer"])
      .order("full_name"),
  ]);

  return (
    <DisciplineClient
      defaultTab={defaultTab}
      profile={profile as Profile}
      isCommand={isCommand(profile)}
      initialSessions={(sessionsRes.data ?? []) as never}
      initialCorrections={(correctionsRes.data ?? []) as never}
      initialPips={(pipsRes.data ?? []) as never}
      initialIssues={(issuesRes.data ?? []) as never}
      cadets={((cadetsRes.data ?? []).sort(byLastName)) as never}
      staffProfiles={((staffRes.data ?? []).sort(byLastName)) as { id: string; full_name: string; rank: string | null }[]}
    />
  );
}
