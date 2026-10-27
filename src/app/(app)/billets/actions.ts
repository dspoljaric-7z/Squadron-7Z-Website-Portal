"use server";

import { requireProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createBillet(data: {
  name: string;
  description?: string | null;
  duties?: string | null;
  prerequisites?: string | null;
  parent_billet_id?: string | null;
  org_section?: string | null;
  sort_order?: number;
  is_advisory?: boolean;
}) {
  const caller = await requireProfile();
  if (caller.role !== "officer") return { error: "Officers only." };

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("billets")
    .insert({
      name: data.name.trim(),
      description: data.description?.trim() || null,
      duties: data.duties?.trim() || null,
      prerequisites: data.prerequisites?.trim() || null,
      parent_billet_id: data.parent_billet_id ?? null,
      org_section: data.org_section ?? null,
      sort_order: data.sort_order ?? 999,
      is_advisory: data.is_advisory ?? false,
      active: true,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { billet: row };
}

export async function updateBilletStructure(
  billetId: string,
  patch: {
    name?: string;
    description?: string | null;
    duties?: string | null;
    prerequisites?: string | null;
    parent_billet_id?: string | null;
    org_section?: string | null;
    sort_order?: number;
    is_advisory?: boolean;
  }
) {
  const caller = await requireProfile();
  if (caller.role !== "officer") return { error: "Officers only." };

  const admin = createAdminClient();
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.description !== undefined) update.description = patch.description?.trim() || null;
  if (patch.duties !== undefined) update.duties = patch.duties?.trim() || null;
  if (patch.prerequisites !== undefined) update.prerequisites = patch.prerequisites?.trim() || null;
  if (patch.parent_billet_id !== undefined) update.parent_billet_id = patch.parent_billet_id;
  if (patch.org_section !== undefined) update.org_section = patch.org_section;
  if (patch.sort_order !== undefined) update.sort_order = patch.sort_order;
  if (patch.is_advisory !== undefined) update.is_advisory = patch.is_advisory;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("billets") as any).update(update).eq("id", billetId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteBillet(billetId: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer") return { error: "Officers only." };

  const admin = createAdminClient();
  // Check no holder and no children
  const { data: billet } = await admin
    .from("billets")
    .select("assigned_to")
    .eq("id", billetId)
    .single();
  if (billet?.assigned_to) return { error: "Cannot delete a filled billet — remove the holder first." };

  const { count } = await admin
    .from("billets")
    .select("id", { count: "exact", head: true })
    .eq("parent_billet_id", billetId);
  if (count && count > 0) return { error: "Cannot delete a billet that has child billets." };

  const { error } = await admin.from("billets").delete().eq("id", billetId);
  if (error) return { error: error.message };
  return { success: true };
}
