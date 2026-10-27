import { requireProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import { canManageAdvancement, canPostBoardResults } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { AdvancementClient } from "@/components/advancement/advancement-client";
import { byLastName } from "@/lib/format";

export default async function AdvancementPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const profile = await requireProfile();
  if (!canManageAdvancement(profile) && !canPostBoardResults(profile) && !profile.is_alpo) redirect("/dashboard");

  const params = await searchParams;
  const defaultTab = params.tab ?? "nominations";

  const supabase = await createClient();
  const [nominationsRes, boardRes, cadetsRes, billetsRes, allCadetsRes, commandStaffRes, rubricRes] = await Promise.all([
    supabase
      .from("billet_nominations")
      .select("*, cadet:profiles!billet_nominations_cadet_id_fkey(full_name, rank), nominator:profiles!billet_nominations_nominated_by_fkey(full_name), approver:profiles!billet_nominations_approved_by_fkey(full_name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("board_results")
      .select("*, cadet:profiles!board_results_cadet_id_fkey(full_name, rank), poster:profiles!board_results_posted_by_fkey(full_name, rank)")
      .order("board_date", { ascending: false }),
    // Sea cadets only (officers have a separate track; not nominated for enlisted billets)
    supabase
      .from("profiles")
      .select("id, full_name, rank")
      .eq("active", true)
      .eq("approved", true)
      .in("role", ["cadet", "nco", "snco"])
      .order("full_name"),
    supabase.from("billets").select("id, name").eq("active", true).order("sort_order"),
    supabase
      .from("profiles")
      .select("id, full_name, rank, role")
      .eq("active", true)
      .in("role", ["cadet", "nco", "snco"])
      .order("full_name"),
    supabase
      .from("profiles")
      .select("id, full_name, rank")
      .eq("active", true)
      .eq("approved", true)
      .in("role", ["officer", "snco"])
      .order("full_name"),
    supabase
      .from("nomination_rubric_categories" as never)
      .select("id, name, description, max_score, sort_order")
      .eq("active", true)
      .order("sort_order"),
  ]);

  return (
    <AdvancementClient
      defaultTab={defaultTab}
      profile={profile}
      canPost={canPostBoardResults(profile)}
      canNominate={canManageAdvancement(profile) || !!profile.is_alpo}
      initialNominations={(nominationsRes.data ?? []) as never}
      initialBoardResults={(boardRes.data ?? []) as never}
      cadets={(cadetsRes.data ?? []).sort(byLastName)}
      billets={billetsRes.data ?? []}
      boardCadets={(allCadetsRes.data ?? []).sort(byLastName)}
      bulkRankCadets={((allCadetsRes.data ?? []).sort(byLastName)) as never}
      commandStaff={(commandStaffRes.data ?? []).sort(byLastName)}
      rubricCategories={(rubricRes.data ?? []) as never}
    />
  );
}
