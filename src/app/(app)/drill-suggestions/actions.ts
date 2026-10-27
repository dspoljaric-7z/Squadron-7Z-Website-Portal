"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/profile";

export type DrillSuggestion = {
  id: string;
  title: string;
  category: string;
  description: string;
  location: string | null;
  duration_minutes: number | null;
  min_personnel: number | null;
  max_personnel: number | null;
  materials_needed: string | null;
  notes: string | null;
  suggested_by: string | null;
  suggested_by_name: string;
  status: "pending" | "used" | "archived";
  used_in_pod_date: string | null;
  created_at: string;
};

export async function submitDrillSuggestion(formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim().slice(0, 150);
  const category = String(formData.get("category") ?? "drill").trim();
  const description = String(formData.get("description") ?? "").trim().slice(0, 1000);
  const location = String(formData.get("location") ?? "").trim().slice(0, 200) || null;
  const duration_minutes = parseInt(String(formData.get("duration_minutes") ?? ""), 10) || null;
  const min_personnel = parseInt(String(formData.get("min_personnel") ?? ""), 10) || null;
  const max_personnel = parseInt(String(formData.get("max_personnel") ?? ""), 10) || null;
  const materials_needed = String(formData.get("materials_needed") ?? "").trim().slice(0, 500) || null;
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500) || null;

  if (!title) return { error: "Title is required." };
  if (!description) return { error: "Description is required." };

  const suggested_by_name = profile.rank
    ? `${profile.rank} ${profile.full_name}`
    : profile.full_name;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { error } = await sb.from("drill_suggestions").insert({
    title,
    category,
    description,
    location,
    duration_minutes,
    min_personnel,
    max_personnel,
    materials_needed,
    notes,
    suggested_by: profile.id,
    suggested_by_name,
    status: "pending",
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function getDrillSuggestions(): Promise<DrillSuggestion[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb
    .from("drill_suggestions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as DrillSuggestion[];
}

export async function updateSuggestionStatus(
  id: string,
  status: "pending" | "used" | "archived",
  usedDate?: string,
) {
  const profile = await requireProfile();
  if (profile.role !== "officer" && profile.role !== "snco" && profile.role !== "nco") {
    return { error: "Unauthorized." };
  }
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { error } = await sb
    .from("drill_suggestions")
    .update({ status, used_in_pod_date: usedDate ?? null })
    .eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}
