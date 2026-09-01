import type { Profile, UserRole } from "@/types/database";
import { isCommand, isMaa, isStaff, isSeniorStaff } from "@/lib/permissions";

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
  | "Trophy";

export interface NavItem {
  href: string;
  label: string;
  iconName: NavIconName;
  roles?: UserRole[];
  requiresCommand?: boolean;
  requiresMaaOrCommand?: boolean;
  requiresStaff?: boolean;
  requiresSeniorStaff?: boolean;
}

// Legacy role helpers (keep for backwards compat)
export const isOfficerRole = (role: UserRole | string) => role === "officer";
export const isSeniorStaffRole = (role: UserRole | string) => role === "officer" || role === "snco";
export const isStaffRole = (role: UserRole | string) => role === "officer" || role === "snco" || role === "nco";

export const NAV_ITEMS: NavItem[] = [
  // Visible to all approved users
  { href: "/dashboard",       label: "Dashboard",         iconName: "LayoutDashboard" },
  { href: "/calendar",        label: "Calendar",           iconName: "CalendarDays" },
  { href: "/announcements",   label: "Announcements",      iconName: "Megaphone" },
  { href: "/chain-of-command",label: "Chain of Command",   iconName: "Network" },

  // Staff only
  { href: "/drill",           label: "Drill Roll Call",    iconName: "ClipboardCheck",  requiresStaff: true },
  { href: "/pod",             label: "Plan of the Day",    iconName: "ClipboardList",   roles: ["officer","snco","cadet"] },
  { href: "/roster",          label: "Roster",             iconName: "Users",           roles: ["officer", "snco", "nco", "cadet"] },
  { href: "/billets",         label: "Billets",            iconName: "Award",           roles: ["officer","snco","cadet"] },
  { href: "/nominations",     label: "Nominations",        iconName: "TrendingUp",      requiresSeniorStaff: true },
  { href: "/board-results",   label: "Board Results",      iconName: "Trophy",          requiresStaff: true },
  { href: "/qualifications",  label: "Qualifications",     iconName: "CheckSquare",     roles: ["officer", "snco", "nco", "cadet"] },
  { href: "/cadet-lookup",    label: "Cadet Lookup",       iconName: "Search",          requiresStaff: true },
  { href: "/divisions",       label: "Divisions",          iconName: "Layers",          roles: ["officer","snco"] },
  // TSW Calendar merged into main Calendar
  { href: "/recruiting",      label: "Recruiting",         iconName: "UserPlus",        requiresSeniorStaff: true },
  { href: "/ideas",           label: "Ideas Bank",         iconName: "Lightbulb",       requiresStaff: true },

  // MAA or Command
  { href: "/inspections",     label: "Uniform Inspections",iconName: "Shirt",           requiresMaaOrCommand: true },

  // Command only
  { href: "/corrections",     label: "Corrections & PIPs", iconName: "FileWarning",     requiresCommand: true },
  { href: "/other-issues",    label: "Other Issues",       iconName: "AlertTriangle",   requiresCommand: true },
  { href: "/access",          label: "Access Control",     iconName: "Key",             requiresCommand: true },
  { href: "/migrate",         label: "Data Migration",     iconName: "Database",        requiresCommand: true },

  // Officer admin
  { href: "/admin",           label: "Admin",              iconName: "ShieldCheck",     roles: ["officer"] },

  // Cadet only
  { href: "/profile",         label: "My Profile",         iconName: "User",            roles: ["cadet"] },
  { href: "/documents",       label: "Documents",          iconName: "FolderOpen",      roles: ["officer","snco","nco","cadet"] },

  // All users
  { href: "/settings",        label: "Settings",           iconName: "Settings" },
];

export function navForProfile(profile: Profile): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.requiresCommand)      return isCommand(profile);
    if (item.requiresMaaOrCommand) return isMaa(profile) || isCommand(profile);
    if (item.requiresStaff)        return isStaff(profile);
    if (item.requiresSeniorStaff)  return isSeniorStaff(profile);
    if (item.roles)                return item.roles.includes(profile.role);
    return true; // no restriction = visible to all
  });
}

/** Legacy function — use navForProfile when profile is available */
export function navForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.requiresCommand || item.requiresMaaOrCommand) return false;
    if (item.requiresStaff)       return isStaffRole(role);
    if (item.requiresSeniorStaff) return isSeniorStaffRole(role);
    if (item.roles)               return item.roles.includes(role);
    return true;
  });
}
