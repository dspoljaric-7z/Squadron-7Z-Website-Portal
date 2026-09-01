"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const profile = await requireProfile();

  const preferred_name = String(formData.get("preferred_name") ?? "").trim() || null;
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const contact_phone = String(formData.get("contact_phone") ?? "").trim() || null;

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
  if (newPass.length < 6) return { error: "Password must be at least 6 characters." };

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
  if (profile.role !== "officer") return { error: "Unauthorized." };

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

export async function activateCadet(profileId: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer") return { error: "Unauthorized." };

  const supabase = await createClient();
  const { data: target } = await supabase.from("profiles").select("email, full_name").eq("id", profileId).single();
  if (!target?.email) return { error: "Profile not found or missing email." };

  const admin = createAdminClient();

  // Generate a recovery link (password-set link) — works for accounts with random passwords
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: target.email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/settings?welcome=1`,
    },
  });

  if (linkError || !linkData?.properties?.action_link) {
    return { error: linkError?.message ?? "Failed to generate activation link." };
  }

  // Mark approved so they can access the portal after setting their password
  await supabase.from("profiles").update({ approved: true }).eq("id", profileId);

  return { success: true, link: linkData.properties.action_link, email: target.email };
}

export async function deactivateCadet(profileId: string) {
  const caller = await requireProfile();
  if (caller.role !== "officer") return { error: "Unauthorized." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ active: false, approved: false }).eq("id", profileId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function updateCadetProfile(
  profileId: string,
  patch: { rank?: string; billet?: string; role?: string; division_id?: string | null }
) {
  const caller = await requireProfile();
  if (caller.role !== "officer") return { error: "Unauthorized." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(patch as never).eq("id", profileId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function sendEmailInvite(formData: FormData) {
  const profile = await requireProfile();
  if (profile.role !== "officer") return { error: "Unauthorized." };

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
