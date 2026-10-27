"use server";

import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSeniorStaff } from "@/lib/permissions";
import type { ProspectStatus, ProspectNoteType } from "@/types/database";
import { activateCadet } from "@/app/(app)/settings/actions";

const DEFAULT_CHECKLIST = [
  "Physical / medical form submitted",
  "NSCC/NLCC membership dues paid",
  "Uniform issued",
  "NSCC/NLCC member ID assigned",
  "Emergency contact on file",
  "Code of conduct signed",
  "Portal account activated",
];

export async function createProspect(data: {
  name: string; unit?: string; school?: string; grade?: string;
  email?: string; phone?: string; guardian_name?: string; guardian_contact?: string;
  source?: string; notes?: string;
}) {
  const profile = await requireProfile();
  if (!isSeniorStaff(profile)) return { error: "Unauthorized." };
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase.from("prospects") as any)
    .insert({ ...data, created_by: profile.id, status: "prospect" })
    .select().single();
  if (error) return { error: error.message };
  return { prospect: row };
}

export async function updateProspectField(
  prospectId: string,
  patch: Partial<{ name: string; unit: string; school: string; grade: string; email: string; phone: string; guardian_name: string; guardian_contact: string; source: string; notes: string; status: ProspectStatus; first_visit_date: string; application_date: string; enrollment_date: string }>
) {
  const profile = await requireProfile();
  if (!isSeniorStaff(profile)) return { error: "Unauthorized." };
  const supabase = await createClient();

  // Auto-seed checklist when moving to enrolled
  if (patch.status === "enrolled") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from("prospect_checklist_items") as any)
      .select("id").eq("prospect_id", prospectId).limit(1);
    if (!existing?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("prospect_checklist_items") as any).insert(
        DEFAULT_CHECKLIST.map((item, i) => ({ prospect_id: prospectId, item, sort_order: i }))
      );
    }
    if (!patch.enrollment_date) patch.enrollment_date = new Date().toISOString().slice(0, 10);
  }
  if (patch.status === "visited" && !patch.first_visit_date) {
    patch.first_visit_date = new Date().toISOString().slice(0, 10);
  }
  if (patch.status === "applied" && !patch.application_date) {
    patch.application_date = new Date().toISOString().slice(0, 10);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("prospects") as any).update(patch).eq("id", prospectId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function addProspectNote(prospectId: string, body: string, type: ProspectNoteType = "note") {
  const profile = await requireProfile();
  if (!isSeniorStaff(profile)) return { error: "Unauthorized." };
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (supabase.from("prospect_notes") as any)
    .insert({ prospect_id: prospectId, body, type, created_by: profile.id })
    .select("*, author:profiles!prospect_notes_created_by_fkey(full_name, rank)").single();
  if (error) return { error: error.message };
  return { note: row };
}

export async function toggleChecklistItem(itemId: string, completed: boolean) {
  const profile = await requireProfile();
  if (!isSeniorStaff(profile)) return { error: "Unauthorized." };
  const supabase = await createClient();
  const patch = completed
    ? { completed: true, completed_by: profile.id, completed_at: new Date().toISOString() }
    : { completed: false, completed_by: null, completed_at: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("prospect_checklist_items") as any).update(patch).eq("id", itemId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function convertToProfile(prospectId: string) {
  const caller = await requireProfile();
  if (!isSeniorStaff(caller)) return { error: "Unauthorized." };

  const supabase = await createClient();
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prospect } = await (supabase.from("prospects") as any)
    .select("*").eq("id", prospectId).single();
  if (!prospect) return { error: "Prospect not found." };
  if ((prospect as { converted_to_profile_id: string | null }).converted_to_profile_id)
    return { error: "Already converted." };

  const email = (prospect as { email: string | null }).email;
  const name = (prospect as { name: string }).name;

  // If email available, pre-create auth user to satisfy user_id NOT NULL
  let userId: string | null = null;
  if (email) {
    const { data: newUser } = await admin.auth.admin.createUser({ email, email_confirm: true });
    userId = newUser?.user?.id ?? null;
  }

  // Create profile row — active + approved so they show in roster immediately
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newProfile, error: profileErr } = await (admin.from("profiles") as any)
    .insert({ full_name: name, role: "cadet", email: email ?? null, active: true, approved: true, rank: "SA", ...(userId ? { user_id: userId } : {}) })
    .select().single();
  if (profileErr) return { error: profileErr.message };

  const profileId = (newProfile as { id: string }).id;

  // Mark prospect as converted
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("prospects") as any)
    .update({ converted_to_profile_id: profileId, status: "enrolled", enrollment_date: new Date().toISOString().slice(0, 10) })
    .eq("id", prospectId);

  // Send activation link/temp password
  if (email) {
    const result = await activateCadet(profileId);
    return { success: true, profileId, ...result };
  }

  return { success: true, profileId, link: null, tempPassword: null };
}

export async function createProspectFromVisitor(visitorId: string, data: {
  name: string;
  unit?: string | null;
  guardian_contact?: string | null;
  notes?: string | null;
  visitDate?: string | null;
}) {
  const profile = await requireProfile();
  if (!isSeniorStaff(profile)) return { error: "Unauthorized." };

  const supabase = await createClient();

  // Check if visitor already has a prospect linked
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from("drill_visitors") as any)
    .select("prospect_id").eq("id", visitorId).single();
  if (existing?.prospect_id) return { prospectId: existing.prospect_id };

  // Create prospect with "visited" status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prospect, error } = await (supabase.from("prospects") as any)
    .insert({
      name: data.name,
      unit: data.unit ?? null,
      guardian_contact: data.guardian_contact ?? null,
      notes: data.notes ?? null,
      status: "visited",
      first_visit_date: data.visitDate ?? new Date().toISOString().slice(0, 10),
      source: "drill_visit",
      created_by: profile.id,
    })
    .select().single();
  if (error) return { error: error.message };

  const prospectId = (prospect as { id: string }).id;

  // Link visitor → prospect
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("drill_visitors") as any)
    .update({ prospect_id: prospectId }).eq("id", visitorId);

  return { prospectId };
}

export async function linkDrillVisitorToProspect(visitorId: string, prospectId: string) {
  const profile = await requireProfile();
  if (!isSeniorStaff(profile)) return { error: "Unauthorized." };
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("drill_visitors") as any)
    .update({ prospect_id: prospectId }).eq("id", visitorId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function convertVisitorToProfile(visitorId: string, visitorName: string, guardianContact?: string | null) {
  const caller = await requireProfile();
  if (!isSeniorStaff(caller)) return { error: "Unauthorized." };

  const admin = createAdminClient();
  const supabase = await createClient();

  // Get the visitor's linked prospect (if any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: visitor } = await (supabase.from("drill_visitors") as any)
    .select("prospect_id").eq("id", visitorId).single();
  const existingProspectId = (visitor as { prospect_id: string | null } | null)?.prospect_id ?? null;

  // Create profile — active + approved so they show in roster immediately
  const email = guardianContact && guardianContact.includes("@") ? guardianContact : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newProfile, error: profileErr } = await (admin.from("profiles") as any)
    .insert({ full_name: visitorName, role: "cadet", active: true, approved: true, rank: "SA", email })
    .select().single();
  if (profileErr) return { error: profileErr.message };

  const profileId = (newProfile as { id: string }).id;

  // Update the prospect to enrolled + link to profile
  if (existingProspectId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("prospects") as any)
      .update({ status: "enrolled", converted_to_profile_id: profileId, enrollment_date: new Date().toISOString().slice(0, 10) })
      .eq("id", existingProspectId);
  }

  // Send activation link if email provided
  if (email) {
    const result = await activateCadet(profileId);
    return { success: true, profileId, ...result };
  }

  return { success: true, profileId, link: null, tempPassword: null };
}
