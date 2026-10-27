import { requireProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { isStaff } from "@/lib/permissions";
import { TswLongRangePlanClient } from "./tsw-lrp-client";

export const metadata = { title: "TSW Long-Range Plan" };

export default async function TswLongRangePlanPage() {
  const profile = await requireProfile();
  if (!isStaff(profile)) redirect("/dashboard");

  const supabase = createAdminClient();
  const [{ data: rows, error }, { data: blocks }] = await Promise.all([
    supabase.from("tsw_long_range_plans" as never).select("*").order("date", { ascending: true }),
    supabase.from("tsw_lrp_blocks" as never).select("*").order("sort_order", { ascending: true }),
  ]);

  return (
    <TswLongRangePlanClient
      profile={profile}
      initialRows={(error ? [] : (rows ?? [])) as never}
      initialBlocks={(blocks ?? []) as never}
      dbError={error ? error.message : null}
    />
  );
}
