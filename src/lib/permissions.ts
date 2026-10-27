import type { Profile, UserRole } from "@/types/database";

// Capabilities each named billet grants.
// null/undefined billet = full backwards-compat officer access.
// Unknown custom billet = no special caps (no access beyond role).
const BILLET_CAPS: Record<string, string[]> = {
  co:           ["command","pod","drill","recruiting","advancement","discipline","announcements","paperwork","admin","inspections","operations"],
  xo:           ["command","pod","drill","recruiting","advancement","discipline","announcements","paperwork","admin","inspections","operations"],
  admin_o:      ["advancement","announcements","paperwork","admin","operations"],
  ops_o:        ["pod","drill","announcements","operations"],
  ass_ops:      ["pod","drill","announcements","operations"],
  pao:          ["announcements"],
  recruiting_o: ["recruiting"],
};

function officerCan(profile: Profile, cap: string): boolean {
  if (profile.role !== "officer") return false;
  const billet = profile.officer_billet;
  if (!billet) return true; // no billet set = full officer access (backwards compat)
  return (BILLET_CAPS[billet] ?? []).includes(cap);
}

/** Can see/edit everything including Corrections, PIPs, Other Issues */
export function isCommand(profile: Profile): boolean {
  if (profile.is_command === true) return true;
  return officerCan(profile, "command");
}

/** Can access Uniform Inspections (but NOT Corrections/Other Issues unless also isCommand) */
export function isMaa(profile: Profile): boolean {
  return profile.is_maa === true;
}

/** Any officer/snco/nco */
export function isStaff(profile: Profile): boolean {
  return profile.role === "officer" || profile.role === "snco" || profile.role === "nco";
}

/**
 * Officer or senior NCO.
 * For officers, scoped billets (PAO, Recruiting, Ops) are NOT full senior staff —
 * they only get what their billet explicitly grants. CO/XO/Admin and officers with
 * no billet set retain full senior-staff access.
 * CCPO and LPO cadets also receive full senior-staff access.
 */
export function isSeniorStaff(profile: Profile): boolean {
  if (profile.role === "snco") return true;
  if (profile.role === "officer") {
    const b = profile.officer_billet;
    if (!b) return true; // no billet = full access (backwards compat)
    return b === "co" || b === "xo" || b === "admin_o";
  }
  // CCPO and LPO billets get full admin access
  if (profile.is_lcpo === true) return true;
  if ([profile.billet, profile.billet_2, profile.billet_3].some(
    (b) => b?.toLowerCase().includes("ccpo") || b?.toLowerCase().includes("command chief")
  )) return true;
  return false;
}

/** Full officer with broad admin-level access (CO/XO/Admin or no billet set) */
export function isFullOfficer(profile: Profile): boolean {
  if (profile.role !== "officer") return false;
  const b = profile.officer_billet;
  if (!b) return true;
  return b === "co" || b === "xo" || b === "admin_o";
}

/** Can manage billets, nominations, and advanced admin */
export function isOfficer(profile: Profile): boolean {
  return profile.role === "officer";
}

/** Can manage advancement tracker and nominations */
export function canManageAdvancementFull(profile: Profile): boolean {
  return isSeniorStaff(profile) || isAlpo(profile);
}

/** Is designated LCPO (unit-level cadet oversight) */
export function isLcpo(profile: Profile): boolean {
  return profile.is_lcpo === true;
}

/** Is designated ALPO (advancement + billet support) */
export function isAlpo(profile: Profile): boolean {
  return profile.is_alpo === true;
}

/** Is designated LPO (Lead PO — top NCO cadet, full admin access) */
export function isLpo(profile: Profile): boolean {
  return profile.is_lcpo === true;
}

/** Is designated CCPO (Command Chief — cadet CO equivalent, full admin access) */
export function isCcpo(profile: Profile): boolean {
  return [profile.billet, profile.billet_2, profile.billet_3].some(
    (b) => b?.toLowerCase().includes("ccpo") || b?.toLowerCase().includes("command chief")
  );
}

/** Is designated OPS (billets board + announcements) */
export function isOps(profile: Profile): boolean {
  return profile.is_ops === true;
}

/** Is designated Yeoman (paperwork + member records) */
export function isYeoman(profile: Profile): boolean {
  return profile.is_yeoman === true;
}

/** Can access Uniform Inspections */
export function canViewInspections(profile: Profile): boolean {
  return isSeniorStaff(profile) || isMaa(profile) || officerCan(profile, "inspections");
}

/** Can manage paperwork tracker */
export function canManagePaperwork(profile: Profile): boolean {
  return isSeniorStaff(profile) || isYeoman(profile);
}

/** Can manage billets board */
export function canManageBillets(profile: Profile): boolean {
  return isSeniorStaff(profile) || isOps(profile) || officerCan(profile, "pod");
}

/** Can post/delete announcements */
export function canPostAnnouncements(profile: Profile): boolean {
  return isSeniorStaff(profile) || isOps(profile) || officerCan(profile, "announcements");
}

/** Can view cadet records list */
export function canViewCadetList(profile: Profile): boolean {
  return isSeniorStaff(profile) || isYeoman(profile) || isLcpo(profile);
}

/** Can access Corrections, PIPs, Other Issues */
export function canViewCorrections(profile: Profile): boolean {
  return isSeniorStaff(profile);
}

/** Can start/manage drill sessions */
export function canManageDrill(profile: Profile): boolean {
  return isSeniorStaff(profile) || !!profile.can_manage_drills || officerCan(profile, "drill");
}

/** Can access and edit recruiting section */
export function canManageRecruiting(profile: Profile): boolean {
  return isSeniorStaff(profile) || isAlpo(profile) || !!profile.can_manage_recruiting || officerCan(profile, "recruiting");
}

/** Can access and edit advancement / board results */
export function canManageAdvancement(profile: Profile): boolean {
  return isSeniorStaff(profile) || !!profile.can_manage_advancement || officerCan(profile, "advancement");
}

/** Can create and close corrections / PIPs */
export function canManageDiscipline(profile: Profile): boolean {
  return isSeniorStaff(profile) || !!profile.can_manage_discipline || officerCan(profile, "discipline");
}

/** Can submit and manage ideas */
export function canManageIdeas(profile: Profile): boolean {
  return isStaff(profile) || !!profile.can_manage_ideas;
}

/** Can create and edit the Plan of Day */
export function canManagePod(profile: Profile): boolean {
  return isSeniorStaff(profile) || !!profile.can_manage_pod || officerCan(profile, "pod");
}

/** Billet/nomination management */
export function canManageNominations(profile: Profile): boolean {
  return isSeniorStaff(profile);
}

/**
 * Can see operations-section nav items (Drill, Absence Requests, Onboarding).
 * Excludes PAO and Recruiting-only officers.
 */
export function canSeeOperations(profile: Profile): boolean {
  if (profile.role === "snco" || profile.role === "nco") return true;
  if (profile.role === "officer") return officerCan(profile, "operations");
  return false;
}

/**
 * Can access officer-admin nav items like the Incident Log.
 * Excludes PAO, Recruiting, and Ops billets.
 */
export function canAccessOfficerAdmin(profile: Profile): boolean {
  if (profile.role !== "officer") return false;
  return isFullOfficer(profile); // CO, XO, Admin, or no billet
}

/** Cadet with a Division PO billet — can view their division's drill attendance */
export function isDivisionLeader(profile: Profile): boolean {
  return [profile.billet, profile.billet_2, profile.billet_3].some(
    (b) => b?.toLowerCase().includes("division po")
  );
}

/** DPO+, SNCO+, Officer, or Yeoman billet */
export function canPostBoardResults(profile: Profile): boolean {
  if (isStaff(profile)) return true;
  return [profile.billet, profile.billet_2, profile.billet_3].some(
    (b) => b?.toLowerCase().includes("yeoman")
  );
}

/** A PIP check — is there an open PIP for this cadet? Call server-side before confirming nominations */
export function roleFromString(role: string): UserRole {
  const valid: UserRole[] = ["cadet", "nco", "snco", "officer", "parent"];
  return valid.includes(role as UserRole) ? (role as UserRole) : "cadet";
}
