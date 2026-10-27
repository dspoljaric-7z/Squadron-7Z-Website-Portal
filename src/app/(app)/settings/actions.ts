"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const profile = await requireProfile();

  const preferred_name = (String(formData.get("preferred_name") ?? "").trim().slice(0, 100)) || null;
  const bio = (String(formData.get("bio") ?? "").trim().slice(0, 500)) || null;
  const contact_phone = (String(formData.get("contact_phone") ?? "").trim().slice(0, 20)) || null;

  const { error } = await supabase
    .from("profiles")
    .update({ preferred_name, bio, contact_phone })
    .eq("id", profile.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const current = String(formData.get("current_password") ?? "");
  const newPass = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!current || !newPass || !confirm) return { error: "All fields required." };
  if (newPass !== confirm) return { error: "Passwords do not match." };
  if (newPass.length < 8) return { error: "Password must be at least 8 characters." };
  if (newPass.length > 128) return { error: "Password must be 128 characters or fewer." };

  // Re-authenticate with current password to verify
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Session error." };

  const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (signInError) return { error: "Current password is incorrect." };

  const { error } = await supabase.auth.updateUser({ password: newPass });
  if (error) return { error: error.message };
  return { success: true };
}

export async function sendBulkInvites(entries: { email: string; full_name: string; rank: string; role: string }[]) {
  const profile = await requireProfile();
  if (profile.role !== "officer" && profile.role !== "snco") return { error: "Unauthorized." };

  const admin = createAdminClient();
  const results: { email: string; success: boolean; error?: string }[] = [];

  for (const entry of entries) {
    try {
      const { error } = await admin.auth.admin.inviteUserByEmail(entry.email, {
        data: { full_name: entry.full_name, role: entry.role, rank: entry.rank },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/settings?welcome=1`,
      });
      results.push({ email: entry.email, success: !error, error: error?.message });
    } catch (e) {
      results.push({ email: entry.email, success: false, error: String(e) });
    }
  }

  return { results };
}

function makeTempPassword(): string {
  const words = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliet"];
  const nums = Math.floor(Math.random() * 900) + 100;
  return `${words[Math.floor(Math.random() * words.length)]}${nums}!`;
}

export async function activateCadet(profileId: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  try {
    const admin = createAdminClient();

    // Fetch profile including user_id (bypasses RLS)
    const { data: target } = await admin.from("profiles").select("email, full_name, user_id").eq("id", profileId).single();
    if (!target?.email) return { error: "Profile not found or missing email." };

    const email: string = target.email as string;
    let userId = (target as unknown as { user_id: string | null }).user_id;

    // If no linked auth user, try creating one
    if (!userId) {
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      if (createErr) {
        // User probably already exists in auth but not linked — generate link will still work
      } else if (newUser?.user?.id) {
        userId = newUser.user.id;
        await admin.from("profiles").update({ user_id: userId }).eq("id", profileId);
      }
    }

    // Set a temp password so email+password login always works as a fallback
    const tempPassword = makeTempPassword();
    if (userId) {
      await admin.auth.admin.updateUserById(userId, { password: tempPassword });
    }

    // Try to generate a one-click activation link
    let activationLink: string | undefined;
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    });
    if (linkData?.properties?.hashed_token) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      activationLink = `${siteUrl}/activate?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}`;
    }

    // Mark active + approved
    await admin.from("profiles").update({ active: true, approved: true }).eq("id", profileId);

    return { success: true, link: activationLink, tempPassword, email };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Admin client not configured — contact your system administrator." };
  }
}

export async function deactivateCadet(profileId: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  const supabase = await createClient();
  const { data: target } = await supabase.from("profiles").select("full_name, email").eq("id", profileId).single();
  const { error } = await supabase.from("profiles").update({ active: false, approved: false }).eq("id", profileId);
  if (error) return { error: error.message };

  // Insert a notification so they see it if a session is still open
  try {
    await supabase.from("notifications").insert({
      profile_id: profileId,
      type: "general",
      title: "Account Deactivated",
      body: `Your portal access has been suspended by ${caller.rank ? caller.rank + " " : ""}${caller.full_name}. Contact your chain of command if you believe this is in error.`,
    });
  } catch { /* best-effort notification */ }

  return { success: true, targetName: (target as unknown as { full_name: string } | null)?.full_name ?? "Cadet" };
}

export async function deleteCadet(profileId: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };
  if (caller.id === profileId) return { error: "You cannot delete your own account." };

  const admin = createAdminClient();

  // Use admin client to read user_id (RLS may hide it from the caller)
  const { data: target } = await admin.from("profiles").select("user_id").eq("id", profileId).single();
  if (!target) return { error: "Profile not found." };

  // Use admin to delete — RLS silently no-ops DELETE for callers who aren't the row owner
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: profileError } = await (admin.from("profiles") as any).delete().eq("id", profileId);
  if (profileError) return { error: profileError.message };

  // Delete the auth user only if one exists; ignore "not found" (user may have been removed already)
  const userId = (target as unknown as { user_id: string | null }).user_id;
  if (userId) {
    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError && !authError.message?.toLowerCase().includes("not found") && !authError.message?.toLowerCase().includes("user not found")) {
      return { error: `Profile deleted but auth user removal failed: ${authError.message}` };
    }
  }

  return { success: true };
}

export async function bulkDeactivateAll() {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("profiles")
    .update({ active: false, approved: false })
    .neq("role", "officer");
  if (error) return { error: error.message };
  return { success: true, count };
}

export async function updateUserEmail(profileId: string, newEmail: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  const email = newEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "Invalid email address." };

  const admin = createAdminClient();

  const { data: target } = await admin.from("profiles").select("user_id").eq("id", profileId).single();
  if (!target) return { error: "Profile not found." };

  const userId = (target as unknown as { user_id: string | null }).user_id;

  if (!userId) {
    // No auth account yet — create one and link it
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (createErr) return { error: createErr.message };
    const newUserId = newUser?.user?.id;
    if (!newUserId) return { error: "Failed to create auth account." };
    const { error: profileError } = await admin.from("profiles").update({ email, user_id: newUserId, active: true, approved: true }).eq("id", profileId);
    if (profileError) return { error: profileError.message };
    // Generate activation link directly — do NOT call activateCadet (it would try to create another auth user)
    const tempPassword = makeTempPassword();
    await admin.auth.admin.updateUserById(newUserId, { password: tempPassword });
    let link: string | null = null;
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({ type: "recovery", email });
      if (linkData?.properties?.hashed_token) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
        link = `${siteUrl}/activate?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}`;
      }
    } catch { /* best-effort link generation */ }
    return { success: true, activated: true, link, tempPassword, email };
  }

  const { error: authError } = await admin.auth.admin.updateUserById(userId, { email });
  if (authError) return { error: authError.message };

  const { error: profileError } = await admin.from("profiles").update({ email }).eq("id", profileId);
  if (profileError) return { error: profileError.message };

  return { success: true };
}

export async function updateCadetProfile(
  profileId: string,
  patch: { full_name?: string; rank?: string; billet?: string | null; role?: string; division_id?: string | null; officer_billet?: string | null }
) {
  const caller = await requireProfile();
  const isOfficer = caller.role === "officer";
  const isLcpo = (caller as unknown as { is_lcpo?: boolean }).is_lcpo === true;
  const isYeoman = (caller as unknown as { is_yeoman?: boolean }).is_yeoman === true;
  const isSNCO = caller.role === "snco";
  const callerBillet = (caller as unknown as { officer_billet?: string | null }).officer_billet ?? null;
  const isOps = callerBillet === "ops_o" || callerBillet === "ass_ops";
  const isNCO = caller.role === "snco" || caller.role === "nco";
  const canManageBillets = isOfficer || isLcpo || isYeoman || isSNCO || isOps;
  if (!canManageBillets && !isNCO) return { error: "Unauthorized." };

  const supabase = await createClient();
  const admin = createAdminClient();

  // Elevated NCO roles (LCPO, SNCO, Yeoman, Ops) can edit across divisions
  // Regular NCOs are scoped to their own division only
  const isElevated = isOfficer || isLcpo || isYeoman || isSNCO || isOps;
  if (!isElevated) {
    if (patch.role !== undefined || patch.division_id !== undefined) {
      return { error: "Unauthorized to change role or division." };
    }
    const { data: target } = await supabase.from("profiles").select("division_id").eq("id", profileId).single();
    if (target && caller.division_id && target.division_id !== caller.division_id) {
      return { error: "NCOs can only edit cadets in their own division." };
    }
  }

  // officer_billet only valid for officers; clear it when changing away from officer role
  const finalPatch = { ...(isElevated ? patch : { rank: patch.rank, billet: patch.billet }) };
  if ("officer_billet" in finalPatch && finalPatch.officer_billet) {
    const targetRole = finalPatch.role ?? (await supabase.from("profiles").select("role").eq("id", profileId).single()).data?.role;
    if (targetRole !== "officer") {
      delete (finalPatch as Record<string, unknown>).officer_billet;
    }
  }
  if ("role" in finalPatch && finalPatch.role !== "officer") {
    (finalPatch as Record<string, unknown>).officer_billet = null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("profiles") as any).update(finalPatch).eq("id", profileId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function advanceNominationStage(
  nominationId: string,
  stage: string,
  reason?: string,
  boardMemberIds?: string[],
) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  const supabase = await createClient();
  const updates: Record<string, unknown> = { stage, updated_at: new Date().toISOString() };
  if (stage === "approved_probation" || stage === "confirmed") updates.approved_by = caller.id;
  if (boardMemberIds !== undefined) updates.board_member_ids = boardMemberIds;

  const { data: before } = await supabase.from("billet_nominations").select("stage").eq("id", nominationId).single();
  const { error } = await supabase.from("billet_nominations").update(updates as never).eq("id", nominationId);
  if (error) return { error: error.message };

  // Insert stage history
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  await admin.from("nomination_stage_history").insert({
    nomination_id: nominationId,
    from_stage: (before as unknown as { stage: string } | null)?.stage ?? null,
    to_stage: stage,
    changed_by: caller.id,
    changed_by_display: `${caller.rank ? caller.rank + " " : ""}${caller.full_name}`,
    reason: reason || null,
  });

  // Notifications
  const { data: nom } = await supabase
    .from("billet_nominations")
    .select("cadet_id, billet_name, board_member_ids")
    .eq("id", nominationId)
    .single();

  if (nom) {
    const STAGE_LABELS: Record<string, string> = {
      nominated: "Nominated",
      applied: "Applied",
      interviewed: "Interviewed",
      approved_probation: "Approved (Probation)",
      confirmed: "Confirmed",
      not_selected: "Not Selected",
    };

    if (["approved_probation", "confirmed", "not_selected"].includes(stage)) {
      const body = stage === "not_selected" && reason
        ? `Your nomination for ${(nom as unknown as { billet_name: string }).billet_name} was not selected. Reason: ${reason}`
        : stage === "confirmed"
          ? `Congratulations! You've been confirmed for ${(nom as unknown as { billet_name: string }).billet_name}`
          : `Your nomination for ${(nom as unknown as { billet_name: string }).billet_name} has been updated: ${STAGE_LABELS[stage]}`;
      await supabase.from("notifications").insert({
        profile_id: (nom as unknown as { cadet_id: string }).cadet_id,
        type: "general",
        title: "Nomination Update",
        body,
      });
    }

    if (["nominated", "applied", "interviewed"].includes(stage)) {
      // Notify board members if assigned, otherwise all command
      const boardIds = (nom as unknown as { board_member_ids?: string[] }).board_member_ids;
      let recipientIds: string[] = [];
      if (boardIds && boardIds.length > 0) {
        recipientIds = boardIds;
      } else {
        const { data: staff } = await supabase.from("profiles").select("id").in("role", ["officer", "snco"]).eq("active", true).eq("approved", true);
        recipientIds = (staff as unknown as { id: string }[])?.map((s) => s.id) ?? [];
      }
      if (recipientIds.length > 0) {
        await supabase.from("notifications").insert(
          recipientIds.map((pid) => ({
            profile_id: pid,
            type: "general" as const,
            title: "Nomination Requires Attention",
            body: `Nomination for ${(nom as unknown as { billet_name: string }).billet_name} is now: ${STAGE_LABELS[stage]}`,
          }))
        );
      }
    }
  }

  return { success: true };
}

export async function submitNominationEval(
  nominationId: string,
  scores: { leadership: number; character: number; technical_knowledge: number; military_bearing: number; teamwork: number; physical_fitness: number },
  comments: string,
) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { error } = await admin.from("nomination_evals").upsert({
    nomination_id: nominationId,
    evaluator_id: caller.id,
    ...scores,
    comments: comments || null,
    submitted_at: new Date().toISOString(),
  }, { onConflict: "nomination_id,evaluator_id" });
  if (error) return { error: error.message };
  return { success: true };
}

export async function selfReportDocument(documentTypeId: string) {
  const caller = await requireProfile();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { error } = await admin.from("document_submissions").insert({
    cadet_id: caller.id,
    document_type_id: documentTypeId,
    collected_at: new Date().toISOString().split("T")[0],
    status: "pending",
    notes: "Self-reported by cadet — pending staff confirmation",
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function confirmDocumentSubmission(submissionId: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco" && caller.role !== "nco") return { error: "Unauthorized." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { error } = await admin.from("document_submissions").update({
    status: "collected",
    collected_by: caller.id,
    notes: null,
  }).eq("id", submissionId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function createBlankPod(date: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("plan_of_day").select("id").eq("date", date).maybeSingle();
  if (existing) return { success: true, id: (existing as unknown as { id: string }).id, existed: true };

  const { data, error } = await supabase.from("plan_of_day").insert({
    date,
    items: [],
    status: "draft",
    created_by: caller.id,
  } as never).select("id").single();
  if (error) return { error: error.message };
  return { success: true, id: (data as unknown as { id: string }).id, existed: false };
}

export async function submitPodForApproval(podId: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  const supabase = await createClient();
  const { error } = await supabase.from("plan_of_day").update({
    status: "submitted",
    submitted_by: caller.id,
    submitted_at: new Date().toISOString(),
  } as never).eq("id", podId);
  if (error) return { error: error.message };

  // Notify CO and XO only
  const { data: officers } = await supabase.from("profiles").select("id").eq("role", "officer").eq("active", true).eq("approved", true).in("officer_billet", ["co", "xo"]);
  if (officers && officers.length > 0) {
    const { data: pod } = await supabase.from("plan_of_day").select("date").eq("id", podId).single();
    const podDate = (pod as unknown as { date: string } | null)?.date ?? "";
    await supabase.from("notifications").insert(
      (officers as unknown as { id: string }[]).map((o) => ({
        profile_id: o.id,
        type: "general" as const,
        title: "POD Submitted for Approval",
        body: `${caller.rank ? caller.rank + " " : ""}${caller.full_name} submitted the Plan of the Day for ${podDate} for your approval.`,
      }))
    );
  }

  return { success: true };
}

export async function approvePod(podId: string, notes?: string) {
  const caller = await requireProfile();
  const isCoOrXo = caller.role === "officer" && (caller.officer_billet === "co" || caller.officer_billet === "xo");
  if (!isCoOrXo) return { error: "Only the CO or XO can approve the POD." };

  const supabase = await createClient();
  const { error } = await supabase.from("plan_of_day").update({
    status: "approved",
    approved_by: caller.id,
    approved_by_name: `${caller.rank ? caller.rank + " " : ""}${caller.full_name}`,
    approved_at: new Date().toISOString(),
    approval_notes: notes?.trim() || null,
  } as never).eq("id", podId);
  if (error) return { error: error.message };

  // Notify the submitter
  const { data: pod } = await supabase.from("plan_of_day").select("submitted_by, date").eq("id", podId).single();
  const podData = pod as unknown as { submitted_by: string | null; date: string } | null;
  if (podData?.submitted_by) {
    await supabase.from("notifications").insert({
      profile_id: podData.submitted_by,
      type: "general",
      title: "POD Approved",
      body: `Your Plan of the Day for ${podData.date} has been approved by ${caller.rank ? caller.rank + " " : ""}${caller.full_name}.`,
    });
  }

  return { success: true };
}

export async function rejectPod(podId: string, notes: string) {
  const caller = await requireProfile();
  const isCoOrXo = caller.role === "officer" && (caller.officer_billet === "co" || caller.officer_billet === "xo");
  if (!isCoOrXo) return { error: "Only the CO or XO can reject the POD." };

  const supabase = await createClient();
  const { error } = await supabase.from("plan_of_day").update({
    status: "rejected",
    approved_by: caller.id,
    approved_by_name: `${caller.rank ? caller.rank + " " : ""}${caller.full_name}`,
    approved_at: new Date().toISOString(),
    approval_notes: notes.trim() || null,
  } as never).eq("id", podId);
  if (error) return { error: error.message };

  // Notify the submitter
  const { data: pod } = await supabase.from("plan_of_day").select("submitted_by, date").eq("id", podId).single();
  const podData = pod as unknown as { submitted_by: string | null; date: string } | null;
  if (podData?.submitted_by) {
    await supabase.from("notifications").insert({
      profile_id: podData.submitted_by,
      type: "general",
      title: "POD Returned for Revision",
      body: `Your Plan of the Day for ${podData.date} was returned by ${caller.rank ? caller.rank + " " : ""}${caller.full_name}${notes ? ": " + notes : "."}`,
    });
  }

  return { success: true };
}

// ─── POD Review Comments ──────────────────────────────────────────────────────

export type PodSection = "uniform" | "oic" | "schedule" | "safety_brief" | "special_events" | "general";

export type PodReviewComment = {
  id: string;
  pod_id: string;
  section: PodSection;
  body: string;
  author_id: string;
  author_name: string;
  resolved: boolean;
  resolved_by: string | null;
  created_at: string;
};

export async function getPodComments(podId: string): Promise<PodReviewComment[]> {
  const caller = await requireProfile();
  if (!caller.active || !caller.approved) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("pod_review_comments" as never)
    .select("*")
    .eq("pod_id", podId)
    .order("created_at", { ascending: true });
  return (data ?? []) as PodReviewComment[];
}

export async function addPodComment(podId: string, section: PodSection, body: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Only officers and SNCOs can leave review comments." };
  if (!body.trim()) return { error: "Comment cannot be empty." };

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb
    .from("pod_review_comments")
    .insert({
      pod_id: podId,
      section,
      body: body.trim(),
      author_id: caller.id,
      author_name: `${caller.rank ? caller.rank + " " : ""}${caller.full_name}`,
    })
    .select()
    .single();
  if (error) return { error: error.message };

  // Notify the POD submitter
  const { data: pod } = await supabase
    .from("plan_of_day")
    .select("submitted_by, date")
    .eq("id", podId)
    .single();
  const podData = pod as unknown as { submitted_by: string | null; date: string } | null;
  if (podData?.submitted_by && podData.submitted_by !== caller.id) {
    await supabase.from("notifications").insert({
      profile_id: podData.submitted_by,
      type: "general",
      title: "New POD Comment",
      body: `${caller.rank ? caller.rank + " " : ""}${caller.full_name} left a comment on the ${podData.date} POD.`,
    });
  }

  return { success: true, comment: data as PodReviewComment };
}

export async function resolvePodComment(commentId: string, resolved: boolean) {
  const caller = await requireProfile();
  if (!caller.active || !caller.approved) return { error: "Unauthorized." };
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { error } = await sb
    .from("pod_review_comments")
    .update({ resolved, resolved_by: resolved ? caller.id : null })
    .eq("id", commentId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function addQualType(name: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { error } = await admin.from("qual_types").insert({ name: trimmed, active: true });
  if (error) return { error: error.message };
  return { success: true };
}

export async function deactivateQualType(id: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { error } = await admin.from("qual_types").update({ active: false }).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function collectDocument(cadetId: string, documentTypeId: string, expiryDate?: string, notes?: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco" && caller.role !== "nco") return { error: "Unauthorized." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { error } = await admin.from("document_submissions").upsert({
    cadet_id: cadetId,
    document_type_id: documentTypeId,
    collected_at: new Date().toISOString().split("T")[0],
    collected_by: caller.id,
    expiry_date: expiryDate || null,
    notes: notes || null,
  }, { onConflict: "cadet_id,document_type_id,collected_at" });
  if (error) return { error: error.message };
  return { success: true };
}

export async function addDocumentType(name: string, description: string, frequency: string, required: boolean) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { error } = await admin.from("document_types").insert({
    name: name.trim(),
    description: description.trim() || null,
    frequency,
    required,
    created_by: caller.id,
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function deactivateDocumentType(id: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { error } = await admin.from("document_types").update({ active: false }).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function updateQualTypeOrder(items: { id: string; sort_order: number }[]) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  for (const { id, sort_order } of items) {
    await admin.from("qual_types").update({ sort_order }).eq("id", id);
  }
  return { success: true };
}

export async function updateQualTypePrerequisites(id: string, prerequisites: string[]) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { error } = await admin.from("qual_types").update({ prerequisites }).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function notifyQualCompletion(cadetId: string) {
  const supabase = await createClient();
  const { data: cadet } = await supabase.from("profiles").select("full_name, rank").eq("id", cadetId).single();
  const cadetDisplay = cadet ? `${(cadet as unknown as { rank: string | null }).rank ? (cadet as unknown as { rank: string }).rank + " " : ""}${(cadet as unknown as { full_name: string }).full_name}` : "A cadet";

  await supabase.from("notifications").insert([
    {
      profile_id: cadetId,
      type: "general",
      title: "100% Qualifications Complete!",
      body: "Congratulations — you have completed all required qualifications. Well done!",
    },
  ]);

  // Also notify all officers/SNCOs
  const { data: staff } = await supabase.from("profiles").select("id").in("role", ["officer", "snco"]).eq("active", true).eq("approved", true);
  if (staff && staff.length > 0) {
    await supabase.from("notifications").insert(
      (staff as unknown as { id: string }[]).map((s) => ({
        profile_id: s.id,
        type: "general" as const,
        title: "Cadet Qual Completion",
        body: `${cadetDisplay} has completed 100% of all qualifications.`,
      }))
    );
  }
  return { success: true };
}

export async function bulkCollectDocument(cadetIds: string[], documentTypeId: string, expiryDate?: string, notes?: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco" && caller.role !== "nco") return { error: "Unauthorized." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const today = new Date().toISOString().split("T")[0];
  const rows = cadetIds.map((cadetId) => ({
    cadet_id: cadetId,
    document_type_id: documentTypeId,
    collected_at: today,
    collected_by: caller.id,
    expiry_date: expiryDate || null,
    notes: notes || null,
    status: "collected",
  }));
  const { error } = await admin.from("document_submissions").upsert(rows, {
    onConflict: "cadet_id,document_type_id,collected_at",
  });
  if (error) return { error: error.message };
  return { success: true, count: cadetIds.length };
}

// ============================================================
// Event RSVP
// ============================================================
export async function upsertEventRsvp(eventId: string, status: "attending" | "not_attending" | "maybe") {
  const caller = await requireProfile();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { error } = await admin.from("event_rsvps").upsert({
    event_id: eventId,
    profile_id: caller.id,
    status,
  }, { onConflict: "event_id,profile_id" });
  if (error) return { error: error.message };
  return { success: true };
}

// ============================================================
// Notification Templates
// ============================================================
export async function updateNotificationTemplate(id: string, titleTemplate: string, bodyTemplate: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { error } = await admin.from("notification_templates").update({
    title_template: titleTemplate,
    body_template: bodyTemplate,
    updated_at: new Date().toISOString(),
    updated_by: caller.id,
  }).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function getNotificationTemplates() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notification_templates" as never).select("*").order("label");
  if (error) return { error: error.message };
  return { data };
}

// ============================================================
// Nomination Rubric Categories
// ============================================================
export async function addRubricCategory(name: string, description: string, maxScore: number) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data: existing } = await admin.from("nomination_rubric_categories").select("sort_order").order("sort_order", { ascending: false }).limit(1).single();
  const sortOrder = existing ? (existing as unknown as { sort_order: number }).sort_order + 1 : 1;

  const { error } = await admin.from("nomination_rubric_categories").insert({
    name: name.trim(),
    description: description.trim() || null,
    max_score: maxScore,
    sort_order: sortOrder,
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function updateRubricCategory(id: string, name: string, description: string, maxScore: number, sortOrder: number) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { error } = await admin.from("nomination_rubric_categories").update({
    name: name.trim(),
    description: description.trim() || null,
    max_score: maxScore,
    sort_order: sortOrder,
  }).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deactivateRubricCategory(id: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { error } = await admin.from("nomination_rubric_categories").update({ active: false }).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function submitDynamicNominationEval(
  nominationId: string,
  scores: { category_id: string; score: number; comments?: string }[],
  overallComments?: string,
) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const rows = scores.map((s) => ({
    nomination_id: nominationId,
    evaluator_id: caller.id,
    category_id: s.category_id,
    score: s.score,
    comments: s.comments || overallComments || null,
    submitted_at: new Date().toISOString(),
  }));
  const { error } = await admin.from("nomination_eval_scores").upsert(rows, {
    onConflict: "nomination_id,evaluator_id,category_id",
  });
  if (error) return { error: error.message };
  return { success: true };
}

// ============================================================
// PIP Close-out Workflow
// ============================================================
export async function closePip(pipId: string, notes: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco" && caller.role !== "nco") return { error: "Unauthorized." };

  const supabase = await createClient();
  const { data: pip } = await supabase.from("pips").select("cadet_id, status").eq("id", pipId).single();
  if (!pip) return { error: "PIP not found." };

  const { error } = await supabase.from("pips").update({
    status: "pending_ack",
    closed_at: new Date().toISOString(),
    closed_by: caller.id,
    closed_by_notes: notes || null,
  } as never).eq("id", pipId);
  if (error) return { error: error.message };

  // Notify cadet
  await supabase.from("notifications").insert({
    profile_id: (pip as unknown as { cadet_id: string }).cadet_id,
    type: "general",
    title: "PIP Closure Pending Your Acknowledgment",
    body: `Your supervisor ${caller.rank ? caller.rank + " " : ""}${caller.full_name} has closed your PIP. Please acknowledge it in the portal.`,
  });

  return { success: true };
}

export async function acknowledgePip(pipId: string) {
  const caller = await requireProfile();

  const supabase = await createClient();
  const { data: pip } = await supabase.from("pips").select("cadet_id, status, closed_by").eq("id", pipId).single();
  if (!pip) return { error: "PIP not found." };

  const pipData = pip as unknown as { cadet_id: string; status: string; closed_by: string | null };
  if (pipData.cadet_id !== caller.id) return { error: "Unauthorized." };
  if (pipData.status !== "pending_ack") return { error: "PIP is not pending acknowledgment." };

  const { error } = await supabase.from("pips").update({
    status: "closed",
    cadet_acknowledged_at: new Date().toISOString(),
  } as never).eq("id", pipId);
  if (error) return { error: error.message };

  // Notify the closer
  if (pipData.closed_by) {
    await supabase.from("notifications").insert({
      profile_id: pipData.closed_by,
      type: "general",
      title: "PIP Acknowledged",
      body: `${caller.rank ? caller.rank + " " : ""}${caller.full_name} has acknowledged their PIP close-out.`,
    });
  }

  return { success: true };
}

// ============================================================
// Recurring Drill Schedule Generator
// ============================================================
export async function createRecurringDrillSessions(
  startDate: string,
  frequencyDays: number,
  count: number,
  location: string,
  uniformOfDay: string,
  maaId: string,
) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };
  if (count < 1 || count > 30) return { error: "Count must be between 1 and 30." };

  const supabase = await createClient();
  const sessions = [];
  const base = new Date(startDate);

  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i * frequencyDays);
    sessions.push({
      date: d.toISOString().split("T")[0],
      location: location || null,
      uniform_of_day: uniformOfDay || null,
      maa_id: maaId || null,
      recorded_by: caller.id,
    });
  }

  const { data, error } = await supabase.from("drill_sessions").insert(sessions as never).select("id, date");
  if (error) return { error: error.message };
  return { success: true, created: (data as unknown as { id: string; date: string }[]).length };
}

// ============================================================
// POD Templates
// ============================================================
export async function savePodTemplate(name: string, items: unknown[]) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { error } = await admin.from("pod_templates").insert({
    name: name.trim(),
    items,
    created_by: caller.id,
  });
  if (error) return { error: error.message };
  return { success: true };
}

// ============================================================
// Unit Settings
// ============================================================
export async function getUnitSettings() {
  const caller = await requireProfile();
  if (caller.role !== "officer" && !caller.is_command) return { error: "Unauthorized." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data, error } = await admin.from("unit_settings").select("*").limit(1).single();
  if (error && error.code !== "PGRST116") return { error: error.message };
  return { data: data ?? null };
}

export async function updateUnitSettings(patch: {
  unit_name?: string;
  unit_number?: string;
  default_drill_location?: string;
  unit_motto?: string;
  contact_email?: string;
  contact_phone?: string;
}) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && !caller.is_command) return { error: "Unauthorized." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  // Upsert singleton row
  const { data: existing } = await admin.from("unit_settings").select("id").limit(1).single();
  if (existing?.id) {
    const { error } = await admin.from("unit_settings").update({
      ...patch,
      updated_at: new Date().toISOString(),
      updated_by: caller.id,
    }).eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin.from("unit_settings").insert({
      ...patch,
      updated_at: new Date().toISOString(),
      updated_by: caller.id,
    });
    if (error) return { error: error.message };
  }
  return { success: true };
}

export async function deletePodTemplate(id: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return { error: "Unauthorized." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { error } = await admin.from("pod_templates").delete().eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function sendEmailInvite(formData: FormData) {
  const profile = await requireProfile();
  if (profile.role !== "officer" && profile.role !== "snco") return { error: "Unauthorized." };

  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "cadet");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const rank = String(formData.get("rank") ?? "").trim() || null;

  if (!email) return { error: "Email is required." };

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName || email.split("@")[0], role, rank },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/settings?welcome=1`,
    });
    if (error) return { error: error.message };
    return { success: true };
  } catch {
    return { error: "Admin client not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local" };
  }
}

// ============================================================
// Paperwork Doc Types
// ============================================================
export async function getPaperworkDocTypes() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("paperwork_doc_types" as never).select("*").eq("active", true).order("sort_order");
  if (error) return { error: error.message };
  return { data };
}

export async function addPaperworkDocType(label: string, shortLabel: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && !caller.is_command) return { error: "Unauthorized." };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("paperwork_doc_types" as never).select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const nextOrder = ((existing as { sort_order: number } | null)?.sort_order ?? 0) + 1;
  const { data, error } = await supabase.from("paperwork_doc_types" as never).insert({ label: label.trim(), short_label: shortLabel.trim() || label.trim(), sort_order: nextOrder } as never).select().single();
  if (error) return { error: error.message };
  return { data };
}

export async function deactivatePaperworkDocType(id: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer" && !caller.is_command) return { error: "Unauthorized." };
  const supabase = await createClient();
  const { error } = await supabase.from("paperwork_doc_types" as never).update({ active: false } as never).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

// ============================================================
// Inspection Item Definitions
// ============================================================
export async function getInspectionItems() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("inspection_item_defs" as never).select("*").eq("active", true).order("sort_order");
  if (error) return { error: error.message };
  return { data };
}

export async function addInspectionItem(itemKey: string, label: string) {
  const caller = await requireProfile();
  if (!caller.is_maa && caller.role !== "officer" && !caller.is_command) return { error: "Unauthorized." };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("inspection_item_defs" as never).select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const nextOrder = ((existing as { sort_order: number } | null)?.sort_order ?? 0) + 1;
  const key = itemKey.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  const { data, error } = await supabase.from("inspection_item_defs" as never).insert({ item_key: key, label: label.trim(), sort_order: nextOrder } as never).select().single();
  if (error) return { error: error.message };
  return { data };
}

export async function deactivateInspectionItem(id: string) {
  const caller = await requireProfile();
  if (!caller.is_maa && caller.role !== "officer" && !caller.is_command) return { error: "Unauthorized." };
  const supabase = await createClient();
  const { error } = await supabase.from("inspection_item_defs" as never).update({ active: false } as never).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

// Returns a map of auth user_id → last_sign_in_at (ISO string or null)
export async function getLastSignInMap(): Promise<Record<string, string | null>> {
  const caller = await requireProfile();
  if (caller.role !== "officer" && caller.role !== "snco") return {};
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const map: Record<string, string | null> = {};
    for (const u of data?.users ?? []) {
      map[u.id] = u.last_sign_in_at ?? null;
    }
    return map;
  } catch {
    return {};
  }
}
