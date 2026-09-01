import type { Profile, UserRole } from "@/types/database";

/** Can see/edit everything including Corrections, PIPs, Other Issues */
export function isCommand(profile: Profile): boolean {
  return profile.is_command === true;
}

/** Can access Uniform Inspections (but NOT Corrections/Other Issues unless also isCommand) */
export function isMaa(profile: Profile): boolean {
  return profile.is_maa === true;
}

/** Any officer/snco/nco */
export function isStaff(profile: Profile): boolean {
  return profile.role === "officer" || profile.role === "snco" || profile.role === "nco";
}

/** Officer or senior NCO */
export function isSeniorStaff(profile: Profile): boolean {
  return profile.role === "officer" || profile.role === "snco";
}

/** Can manage billets, nominations, and advanced admin */
export function isOfficer(profile: Profile): boolean {
  return profile.role === "officer";
}

/** Can access Uniform Inspections */
export function canViewInspections(profile: Profile): boolean {
  return isMaa(profile) || isCommand(profile);
}

/** Can access Corrections, PIPs, Other Issues */
export function canViewCorrections(profile: Profile): boolean {
  return isCommand(profile);
}

/** Can start/manage drill sessions */
export function canManageDrill(profile: Profile): boolean {
  return isStaff(profile);
}

/** Billet/nomination management */
export function canManageNominations(profile: Profile): boolean {
  return isSeniorStaff(profile);
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
