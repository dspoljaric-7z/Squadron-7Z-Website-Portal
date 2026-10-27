import type { Profile, UserRole } from "@/types/database";
import { isCommand, isMaa, isStaff, isSeniorStaff, canManageRecruiting, canManageAdvancement, canManageDrill, canManageDiscipline, canManageIdeas, canManagePod, isDivisionLeader, canSeeOperations, canAccessOfficerAdmin } from "@/lib/permissions";

export type NavIconName =
  | "LayoutDashboard"
  | "CalendarDays"
  | "Megaphone"
  | "ClipboardCheck"
  | "Users"
  | "User"
  | "FolderOpen"
  | "Images"
  | "ShieldCheck"
  | "ClipboardList"
  | "Award"
  | "Layers"
  | "Network"
  | "CheckSquare"
  | "Search"
  | "TrendingUp"
  | "Shirt"
  | "AlertTriangle"
  | "FileWarning"
  | "Lightbulb"
  | "UserPlus"
  | "Key"
  | "Calendar"
  | "Database"
  | "Settings"
  | "BookOpen"
  | "Trophy"
  | "Shield"
  | "ClipboardList2"
  | "FileCheck"
  | "History"
  | "CalendarOff"
  | "GanttChart"
  | "Map"
  | "ScrollText"
  | "DoorOpen"
  | "BarChart2";

export interface NavItem {
  href: string;
  label: string;
  iconName: NavIconName;
  section?: string;
  roles?: UserRole[];
  requiresCommand?: boolean;
  requiresMaaOrCommand?: boolean;
  requiresStaff?: boolean;
  requiresSeniorStaff?: boolean;
  requiresAdminAccess?: boolean;
  requiresRecruiting?: boolean;
  requiresAdvancement?: boolean;
  requiresDrills?: boolean;
  requiresDiscipline?: boolean;
  requiresIdeas?: boolean;
  requiresPod?: boolean;
  requiresAbsenceReview?: boolean;
  requiresOnboardingAccess?: boolean;
  requiresOfficerAdmin?: boolean;
}

// Legacy role helpers (keep for backwards compat)
export const isOfficerRole = (role: UserRole | string) => role === "officer";
export const isSeniorStaffRole = (role: UserRole | string) => role === "officer" || role === "snco";
export const isStaffRole = (role: UserRole | string) => role === "officer" || role === "snco" || role === "nco";

export const NAV_ITEMS: NavItem[] = [
  // ── Home ──────────────────────────────────────────────────────────────
  { href: "/dashboard",        label: "Dashboard",          iconName: "LayoutDashboard",  section: "Home" },
  { href: "/calendar",         label: "Calendar",            iconName: "CalendarDays",     section: "Home" },
  { href: "/announcements",    label: "Announcements",       iconName: "Megaphone",        section: "Home" },
  { href: "/chain-of-command", label: "Chain of Command",    iconName: "Network",          section: "Home" },

  // ── Operations ────────────────────────────────────────────────────────
  { href: "/drill",            label: "Drill Muster",          iconName: "ClipboardCheck",   section: "Operations", requiresDrills: true },
  { href: "/pod",              label: "SQ7Z Plan of Day",      iconName: "ClipboardList",    section: "Operations" },
  { href: "/long-range-plan",  label: "SQ7Z Long-Range Plan",  iconName: "GanttChart",       section: "Operations", requiresStaff: true },
  { href: "/tsw-lrp",          label: "TSW Long-Range Plan",   iconName: "Map",              section: "Operations", requiresStaff: true },
  { href: "/tsw-pod",          label: "TSW Plan of Day",       iconName: "ScrollText",       section: "Operations" },
  { href: "/absence-requests",  label: "Absence Requests",      iconName: "CalendarOff",      section: "Operations", requiresAbsenceReview: true },
  { href: "/early-departure",   label: "Early Departure",       iconName: "DoorOpen",         section: "Operations" },
  { href: "/drill-suggestions", label: "Drill Ideas",           iconName: "Lightbulb",        section: "Operations" },
  { href: "/onboarding",       label: "Cadet Onboarding",      iconName: "ClipboardList2",   section: "Operations", requiresOnboardingAccess: true },

  // ── People ────────────────────────────────────────────────────────────
  { href: "/roster",           label: "Roster",              iconName: "Users",            section: "People", roles: ["officer", "snco", "nco", "cadet"] },
  { href: "/qualifications",   label: "Qualifications",      iconName: "CheckSquare",      section: "People", roles: ["officer", "snco", "nco", "cadet"] },
  { href: "/color-guard",      label: "Color Guard",         iconName: "Shield",           section: "People", roles: ["officer", "snco", "nco", "cadet"] },
  { href: "/billets",          label: "Billets",             iconName: "Award",            section: "People", roles: ["officer","snco","nco","cadet"] },

  // ── Unit ──────────────────────────────────────────────────────────────
  { href: "/divisions",        label: "Divisions",           iconName: "Layers",           section: "Unit", roles: ["officer","snco"] },
  { href: "/advancement",      label: "Advancement",         iconName: "TrendingUp",       section: "Unit", requiresAdvancement: true },
  { href: "/recruiting",       label: "Recruiting",          iconName: "UserPlus",         section: "Unit", requiresRecruiting: true },
  { href: "/gallery",          label: "Photo Gallery",       iconName: "Images",           section: "Unit", roles: ["officer","snco","nco","cadet"] },
  { href: "/report",           label: "Unit Report",         iconName: "BarChart2",        section: "Unit", requiresSeniorStaff: true },

  // ── Discipline ────────────────────────────────────────────────────────
  { href: "/discipline",       label: "Discipline",          iconName: "Shield",           section: "Discipline", requiresDiscipline: true },
  { href: "/inspections",      label: "Inspections",         iconName: "Search",           section: "Discipline", requiresMaaOrCommand: true },
  { href: "/paperwork",        label: "Paperwork Tracker",   iconName: "FileWarning",      section: "Discipline", requiresSeniorStaff: true },

  // ── Admin ─────────────────────────────────────────────────────────────
  { href: "/admin",            label: "Admin",               iconName: "ShieldCheck",      section: "Admin", requiresAdminAccess: true },
  { href: "/guide",            label: "Admin Guide",         iconName: "BookOpen",         section: "Admin", requiresStaff: true },

  // ── Personal ──────────────────────────────────────────────────────────
  { href: "/onboarding",       label: "Onboarding",          iconName: "ClipboardList2",   section: "Personal", roles: ["cadet"] },
  { href: "/my-record",        label: "My Record",           iconName: "BookOpen",         section: "Personal", roles: ["officer","snco","nco","cadet"] },
  { href: "/profile",          label: "My Profile",          iconName: "User",             section: "Personal", roles: ["cadet"] },
  { href: "/documents",        label: "Documents",           iconName: "FolderOpen",       section: "Personal", roles: ["officer","snco","nco","cadet"] },
  { href: "/doc-tracker",      label: "Doc Tracker",         iconName: "FileCheck",        section: "Personal", roles: ["officer","snco","nco","cadet"] },
  { href: "/settings",         label: "Settings",            iconName: "Settings",         section: "Personal" },
];

export function navForProfile(profile: Profile): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.requiresCommand)        return isCommand(profile);
    if (item.requiresMaaOrCommand)   return isMaa(profile) || isCommand(profile);
    if (item.requiresStaff)          return isStaff(profile);
    if (item.requiresSeniorStaff)    return isSeniorStaff(profile);
    if (item.requiresAdminAccess)    return isSeniorStaff(profile) || profile.is_yeoman === true;
    if (item.requiresOfficerAdmin)   return canAccessOfficerAdmin(profile);
    if (item.requiresDrills)           return canManageDrill(profile) || canSeeOperations(profile) || isDivisionLeader(profile);
    if (item.requiresRecruiting)       return canManageRecruiting(profile);
    if (item.requiresAdvancement)      return canManageAdvancement(profile);
    if (item.requiresDiscipline)       return canManageDiscipline(profile);
    if (item.requiresIdeas)            return canManageIdeas(profile);
    if (item.requiresPod)              return canManagePod(profile);
    if (item.requiresAbsenceReview)    return canSeeOperations(profile) || isDivisionLeader(profile);
    if (item.requiresOnboardingAccess) return canSeeOperations(profile) || profile.is_yeoman === true;
    if (item.roles)                return item.roles.includes(profile.role);
    return true; // no restriction = visible to all
  });
}

/** Legacy function — use navForProfile when profile is available */
export function navForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.requiresCommand || item.requiresMaaOrCommand) return false;
    if (item.requiresStaff)        return isStaffRole(role);
    if (item.requiresSeniorStaff)  return isSeniorStaffRole(role);
    if (item.requiresAdminAccess)  return isSeniorStaffRole(role);
    if (item.requiresDrills)       return isStaffRole(role);
    if (item.requiresRecruiting)   return isSeniorStaffRole(role);
    if (item.requiresAdvancement)  return isSeniorStaffRole(role);
    if (item.requiresDiscipline)   return isSeniorStaffRole(role);
    if (item.requiresIdeas)        return isStaffRole(role);
    if (item.requiresPod)          return isSeniorStaffRole(role);
    if (item.roles)                return item.roles.includes(role);
    return true;
  });
}
