import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isStaff } from "@/lib/permissions";
import { LongRangePlanClient } from "./long-range-plan-client";

export const metadata = { title: "Long-Range Plan" };

export default async function LongRangePlanPage() {
  const profile = await requireProfile();
  if (!isStaff(profile)) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: rows, error }, { data: blocks }] = await Promise.all([
    supabase.from("long_range_plan" as never).select("*").order("week_start", { ascending: true }),
    supabase.from("long_range_plan_blocks" as never).select("*").order("sort_order", { ascending: true }),
  ]);

  return (
    <LongRangePlanClient
      profile={profile}
      initialRows={(error ? [] : (rows ?? [])) as never}
      initialBlocks={(blocks ?? []) as never}
      dbError={error ? error.message : null}
    />
  );
}
