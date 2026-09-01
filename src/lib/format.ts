import { BILLET_RANK, RANK_PHASE } from "@/lib/constants";
import type { Profile } from "@/types/database";

export function roleLabel(role: string): string {
  switch (role) {
    case "officer": return "Officer";
    case "snco": return "Senior NCO";
    case "nco": return "NCO";
    case "cadet": return "Cadet";
    case "parent": return "Parent/Guardian";
    default: return role;
  }
}

export const ROLE_ORDER: Record<string, number> = {
  officer: 0,
  snco: 1,
  nco: 2,
  cadet: 3,
  parent: 4,
};

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** "First Last" → "Last, First" for list display */
export function lastFirst(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length < 2) return name;
  const last = parts[parts.length - 1];
  const first = parts.slice(0, parts.length - 1).join(" ");
  return `${last}, ${first}`;
}

/** Sort comparator: alphabetical by last name */
export function byLastName<T extends { full_name: string }>(a: T, b: T): number {
  return lastFirst(a.full_name).localeCompare(lastFirst(b.full_name));
}

/** Returns the best (lowest = most senior) seniority rank across all billets a cadet holds */
export function computedSeniority(profile: Pick<Profile, "billet" | "billet_2" | "billet_3">): number {
  const billets = [profile.billet, profile.billet_2, profile.billet_3].filter(Boolean) as string[];
  if (billets.length === 0) return 999;
  return Math.min(...billets.map((b) => BILLET_RANK[b] ?? 99));
}

/** Returns the training phase label based on the cadet's rank string */
export function computedTrainingPhase(rank: string | null): string | null {
  if (!rank) return null;
  const key = rank.trim();
  return RANK_PHASE[key] ?? null;
}

/** Returns all billets a profile holds (non-null) */
export function allBillets(profile: Pick<Profile, "billet" | "billet_2" | "billet_3">): string[] {
  return [profile.billet, profile.billet_2, profile.billet_3].filter(Boolean) as string[];
}
