import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isStaff, canPostBoardResults } from "@/lib/permissions";
import { BoardResultsClient } from "@/components/board-results/board-results-client";

export default async function BoardResultsPage() {
  const profile = await requireProfile();
  if (!isStaff(profile) && !canPostBoardResults(profile)) redirect("/dashboard");

  const supabase = await createClient();
  const [resultsRes, cadetsRes] = await Promise.all([
    supabase
      .from("board_results")
      .select("*, cadet:profiles!board_results_cadet_id_fkey(full_name, rank), poster:profiles!board_results_posted_by_fkey(full_name, rank)")
      .order("board_date", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, rank, role")
      .eq("active", true)
      .in("role", ["cadet", "nco", "snco"])
      .order("full_name"),
  ]);

  return (
    <BoardResultsClient
      profile={profile}
      initialResults={(resultsRes.data ?? []) as never}
      cadets={cadetsRes.data ?? []}
      canPost={canPostBoardResults(profile)}
    />
  );
}
