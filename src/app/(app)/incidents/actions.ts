"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/profile";
import { revalidatePath } from "next/cache";

type Result = { success: true } | { error: string };

async function requireOfficer() {
  const profile = await requireProfile();
  if (profile.role !== "officer") throw new Error("Unauthorized");
  return profile;
}

export type IncidentReport = {
  id: string;
  reported_by: string | null;
  incident_date: string;
  incident_time: string | null;
  location: string;
  incident_type: "injury" | "medical" | "behavioral" | "property" | "other";
  description: string;
  cadets_involved: string[];
  witnesses: string | null;
  follow_up_action: string | null;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
};

export async function createIncidentReport(
  data: Omit<IncidentReport, "id" | "reported_by" | "created_at" | "updated_at">
): Promise<Result> {
  try {
    const profile = await requireOfficer();
    const supabase = await createClient();
    const { error } = await supabase
      .from("incident_reports" as never)
      .insert({ ...data, reported_by: profile.id } as never);
    if (error) return { error: error.message };
    revalidatePath("/incidents");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updateIncidentReport(
  id: string,
  data: Partial<Omit<IncidentReport, "id" | "reported_by" | "created_at">>
): Promise<Result> {
  try {
    await requireOfficer();
    const supabase = await createClient();
    const { error } = await supabase
      .from("incident_reports" as never)
      .update({ ...data, updated_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/incidents");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function closeIncidentReport(id: string): Promise<Result> {
  return updateIncidentReport(id, { status: "closed" });
}

export async function reopenIncidentReport(id: string): Promise<Result> {
  return updateIncidentReport(id, { status: "open" });
}
