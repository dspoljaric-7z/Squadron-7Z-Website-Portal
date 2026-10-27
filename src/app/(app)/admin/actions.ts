"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/profile";
import { revalidatePath } from "next/cache";

export type LeadershipEntry = {
  id: string;
  title: string;
  name: string;
  initials: string;
  description: string;
  sort_order: number;
};

type Result = { success: true } | { error: string };

async function requireOfficer() {
  const profile = await requireProfile();
  if (profile.role !== "officer" && profile.role !== "snco" && !profile.is_yeoman) throw new Error("Unauthorized");
  return profile;
}

export async function upsertLeadershipEntry(
  entry: Omit<LeadershipEntry, "id"> & { id?: string }
): Promise<Result> {
  try {
    await requireOfficer();
    const supabase = await createClient();
    const { error } = entry.id
      ? await supabase
          .from("leadership" as never)
          .update({ title: entry.title, name: entry.name, initials: entry.initials, description: entry.description, sort_order: entry.sort_order } as never)
          .eq("id", entry.id)
      : await supabase
          .from("leadership" as never)
          .insert({ title: entry.title, name: entry.name, initials: entry.initials, description: entry.description, sort_order: entry.sort_order } as never);
    if (error) return { error: error.message };
    return { success: true };
  } catch {
    return { error: "Unauthorized" };
  }
}

export async function deleteLeadershipEntry(id: string): Promise<Result> {
  try {
    await requireOfficer();
    const supabase = await createClient();
    const { error } = await supabase.from("leadership" as never).delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
  } catch {
    return { error: "Unauthorized" };
  }
}

export type TrainingEntry = {
  id: string;
  category: string;
  category_tagline: string;
  name: string;
  location: string;
  duration: string;
  overview: string;
  what_you_do: string[];
  what_you_earn: string[];
  who_its_for: string;
  sort_order: number;
  category_sort_order: number;
};

export async function upsertTrainingEntry(
  entry: Omit<TrainingEntry, "id"> & { id?: string }
): Promise<Result> {
  try {
    await requireOfficer();
    const supabase = await createClient();
    const fields = {
      category: entry.category,
      category_tagline: entry.category_tagline,
      name: entry.name,
      location: entry.location,
      duration: entry.duration,
      overview: entry.overview,
      what_you_do: entry.what_you_do,
      what_you_earn: entry.what_you_earn,
      who_its_for: entry.who_its_for,
      sort_order: entry.sort_order,
      category_sort_order: entry.category_sort_order,
    };
    const { error } = entry.id
      ? await supabase.from("trainings" as never).update(fields as never).eq("id", entry.id)
      : await supabase.from("trainings" as never).insert(fields as never);
    if (error) return { error: error.message };
    return { success: true };
  } catch {
    return { error: "Unauthorized" };
  }
}

export async function deleteTrainingEntry(id: string): Promise<Result> {
  try {
    await requireOfficer();
    const supabase = await createClient();
    const { error } = await supabase.from("trainings" as never).delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
  } catch {
    return { error: "Unauthorized" };
  }
}

export type AlumniEntry = {
  id: string;
  name: string;
  years: string;
  rank: string;
  now_position: string;
  detail: string;
  trainings: string[];
  sort_order: number;
};

export async function upsertAlumniEntry(
  entry: Omit<AlumniEntry, "id"> & { id?: string }
): Promise<Result> {
  try {
    await requireOfficer();
    const supabase = await createClient();
    const fields = {
      name: entry.name,
      years: entry.years,
      rank: entry.rank,
      now_position: entry.now_position,
      detail: entry.detail,
      trainings: entry.trainings,
      sort_order: entry.sort_order,
    };
    const { error } = entry.id
      ? await supabase.from("public_alumni" as never).update(fields as never).eq("id", entry.id)
      : await supabase.from("public_alumni" as never).insert(fields as never);
    if (error) return { error: error.message };
    return { success: true };
  } catch {
    return { error: "Unauthorized" };
  }
}

export async function deleteAlumniEntry(id: string): Promise<Result> {
  try {
    await requireOfficer();
    const supabase = await createClient();
    const { error } = await supabase.from("public_alumni" as never).delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
  } catch {
    return { error: "Unauthorized" };
  }
}

export type FAQEntry = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
};

export async function upsertFAQEntry(
  entry: Omit<FAQEntry, "id"> & { id?: string }
): Promise<Result> {
  try {
    await requireOfficer();
    const supabase = await createClient();
    const fields = {
      question: entry.question,
      answer: entry.answer,
      sort_order: entry.sort_order,
    };
    const { error } = entry.id
      ? await supabase.from("public_faqs" as never).update(fields as never).eq("id", entry.id)
      : await supabase.from("public_faqs" as never).insert(fields as never);
    if (error) return { error: error.message };
    return { success: true };
  } catch {
    return { error: "Unauthorized" };
  }
}

export async function deleteFAQEntry(id: string): Promise<Result> {
  try {
    await requireOfficer();
    const supabase = await createClient();
    const { error } = await supabase.from("public_faqs" as never).delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
  } catch {
    return { error: "Unauthorized" };
  }
}

export async function setPublicSiteEnabled(enabled: boolean): Promise<Result> {
  try {
    await requireOfficer();
    const supabase = createAdminClient();
    const { error } = await supabase.from("site_settings").update({ public_site_enabled: enabled }).eq("id", 1);
    if (error) return { error: error.message };
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
