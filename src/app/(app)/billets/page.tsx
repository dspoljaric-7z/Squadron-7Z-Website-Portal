import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { BilletsClient } from "@/components/billets/billets-client";
import { byLastName } from "@/lib/format";

export type BilletApplication = {
  id: string;
  billet_id: string;
  cadet_id: string;
  statement: string | null;
  status: "pending" | "selected" | "rejected";
  created_at: string;
  cadet: { id: string; full_name: string; rank: string | null; role: string } | null;
};

export default async function BilletsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const isOfficer = profile.role === "officer" || profile.role === "snco" || profile.is_ops || profile.is_command;

  const [billetsRes, profilesRes, myInterestsRes, allApplicationsRes] = await Promise.all([
    supabase
      .from("billets")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, rank, role, avatar_url")
      .eq("active", true)
      .eq("approved", true)
      .in("role", ["cadet", "nco", "snco", "officer"])
      .order("full_name"),
    supabase
      .from("billet_interests" as never)
      .select("billet_id, statement, status")
      .eq("cadet_id", profile.id),
    isOfficer
      ? supabase
          .from("billet_interests" as never)
          .select("id, billet_id, cadet_id, statement, status, created_at, cadet:profiles!cadet_id(id, full_name, rank, role)")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as BilletApplication[] }),
  ]);

  type InterestRow = { billet_id: string; statement: string | null; status: string };
  const myInterests = (myInterestsRes.data ?? []) as InterestRow[];

  return (
    <BilletsClient
      profile={profile}
      initialBillets={billetsRes.data ?? []}
      allProfiles={(profilesRes.data ?? []).sort(byLastName)}
      myInterestBilletIds={myInterests.map((r) => r.billet_id)}
      allApplications={isOfficer ? (allApplicationsRes.data ?? []) as BilletApplication[] : []}
    />
  );
}
