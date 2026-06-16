import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";
import { redirect } from "next/navigation";

export async function getCurrentProfile(): Promise<{ profile: Profile; userId: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) return null;
  return { profile, userId: user.id };
}

export async function requireProfile(): Promise<Profile> {
  const result = await getCurrentProfile();
  if (!result) redirect("/login");
  return result.profile;
}

export { roleLabel, initials } from "@/lib/format";
