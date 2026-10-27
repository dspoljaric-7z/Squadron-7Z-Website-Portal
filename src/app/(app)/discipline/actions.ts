"use server";

import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageDiscipline, isCommand } from "@/lib/permissions";

export type PipFormData = {
  cadet_id: string;
  area_of_concern: string;
  root_cause: string;
  specific_requirements: string;
  review_date: string;
  timeline: string;
  goals: string;
  support_resources: string;
  meeting_frequency: string;
  supervisor_id: string;
};

export async function createPip(form: PipFormData): Promise<{ error?: string; id?: string }> {
  const profile = await requireProfile();
  if (!canManageDiscipline(profile)) return { error: "Not authorized" };

  const sb = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sbAny = sb as any;
  const { data, error } = await sbAny
    .from("pips")
    .insert({
      cadet_id: form.cadet_id,
      root_cause: form.root_cause,
      timeline: form.timeline || null,
      goals: form.goals || null,
      supervisor_id: form.supervisor_id || null,
      co_id: profile.id,
      status: "open",
      area_of_concern: form.area_of_concern || null,
      specific_requirements: form.specific_requirements || null,
      review_date: form.review_date || null,
      support_resources: form.support_resources || null,
      meeting_frequency: form.meeting_frequency || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const pipId = (data as { id: string }).id;

  // Notify the cadet
  const supabase = await createClient();
  await supabase.from("notifications").insert({
    profile_id: form.cadet_id,
    type: "pip_opened",
    title: "Performance Improvement Plan Opened",
    body: `A PIP has been opened by ${profile.rank ? profile.rank + " " : ""}${profile.full_name}. Please review with your supervisor.`,
  });

  // Notify supervisor if assigned
  if (form.supervisor_id && form.supervisor_id !== profile.id) {
    await supabase.from("notifications").insert({
      profile_id: form.supervisor_id,
      type: "general",
      title: "PIP Assigned to You as Supervisor",
      body: `You have been assigned as supervisor for a new PIP. Please review and schedule check-ins with the cadet.`,
    });
  }

  // Notify command staff (CO/XO)
  const { data: commandProfiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("active", true)
    .eq("approved", true)
    .eq("role", "officer")
    .in("officer_billet", ["co", "xo"]);

  if (commandProfiles && commandProfiles.length > 0) {
    const notifications = commandProfiles
      .filter((p) => p.id !== profile.id)
      .map((p) => ({
        profile_id: p.id,
        type: "general" as const,
        title: "New PIP Opened",
        body: `${profile.rank ? profile.rank + " " : ""}${profile.full_name} opened a PIP. Review it in the Discipline section.`,
      }));
    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }
  }

  return { id: pipId };
}

export async function updatePipStatus(
  pipId: string,
  status: "pending_ack" | "failed",
  outcomeNotes: string
): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (!canManageDiscipline(profile)) return { error: "Not authorized" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("pips")
    .update({
      status,
      outcome_notes: outcomeNotes,
      closed_at: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      closed_by: profile.id as any,
    } as never)
    .eq("id", pipId);

  if (error) return { error: error.message };

  if (status === "pending_ack") {
    // Notify cadet to acknowledge
    const { data: pip } = await supabase.from("pips").select("cadet_id, supervisor_id").eq("id", pipId).single();
    if (pip?.cadet_id) {
      await supabase.from("notifications").insert({
        profile_id: pip.cadet_id,
        type: "general",
        title: "PIP Closure Pending Your Acknowledgment",
        body: `${profile.rank ? profile.rank + " " : ""}${profile.full_name} has closed your PIP. Please acknowledge it in the portal.`,
      });
    }
  }

  return {};
}

export async function deletePip(pipId: string): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (!canManageDiscipline(profile)) return { error: "Not authorized" };

  const sb = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sbAny = sb as any;
  const { error } = await sbAny.from("pips").delete().eq("id", pipId);
  if (error) return { error: error.message };
  return {};
}

export async function getPipDetails(pipId: string): Promise<{ error?: string; pip?: Record<string, unknown> }> {
  const profile = await requireProfile();
  if (!canManageDiscipline(profile) && !isCommand(profile)) return { error: "Not authorized" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pips")
    .select("*, cadet:profiles!pips_cadet_id_fkey(id, full_name, rank), supervisor:profiles!pips_supervisor_id_fkey(full_name, rank)")
    .eq("id", pipId)
    .single();

  if (error) return { error: error.message };
  return { pip: data as Record<string, unknown> };
}
