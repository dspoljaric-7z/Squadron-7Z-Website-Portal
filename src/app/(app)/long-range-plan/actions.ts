"use server";

import { requireProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSeniorStaff } from "@/lib/permissions";

type BlockType = "phase" | "major_event" | "minor_event" | "prt" | "custom";

export async function addLrpBlock(
  planId: string,
  phase: 1 | 2 | 3 | null,
  topic: string,
  blockType: BlockType,
  sortOrder: number
): Promise<{ error?: string; data?: Record<string, unknown> }> {
  const profile = await requireProfile();
  if (!isSeniorStaff(profile)) return { error: "Not authorized" };

  const sb = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sbAny = sb as any;
  const { data, error } = await sbAny
    .from("long_range_plan_blocks")
    .insert({
      plan_id: planId,
      phase,
      block_type: blockType,
      topic,
      sort_order: sortOrder,
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as Record<string, unknown> };
}

export async function removeLrpBlock(blockId: string): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (!isSeniorStaff(profile)) return { error: "Not authorized" };

  const sb = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sbAny = sb as any;
  const { error } = await sbAny.from("long_range_plan_blocks").delete().eq("id", blockId);
  if (error) return { error: error.message };
  return {};
}

export async function addLrpPlan(
  weekStart: string,
  theme: string,
  notes: string,
  status: string,
  createdBy: string,
  drillType: "drill" | "event" = "drill"
): Promise<{ error?: string; data?: Record<string, unknown> }> {
  const profile = await requireProfile();
  if (!isSeniorStaff(profile)) return { error: "Not authorized" };

  const sb = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sbAny = sb as any;
  const { data, error } = await sbAny
    .from("long_range_plan")
    .insert({
      week_start: weekStart,
      theme,
      notes,
      status,
      created_by: createdBy,
      drill_type: drillType,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as Record<string, unknown> };
}
