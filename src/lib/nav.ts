import type { UserRole } from "@/types/database";

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
  | "Layers";

export interface NavItem {
  href: string;
  label: string;
  iconName: NavIconName;
  roles?: UserRole[];
}

// Role helpers — use these everywhere instead of raw string comparisons
export const isOfficer = (role: UserRole | string) => role === "officer";
export const isSeniorStaff = (role: UserRole | string) => role === "officer" || role === "snco";
export const isStaff = (role: UserRole | string) => role === "officer" || role === "snco" || role === "nco";

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", iconName: "LayoutDashboard" },
  { href: "/calendar", label: "Calendar", iconName: "CalendarDays" },
  { href: "/announcements", label: "Announcements", iconName: "Megaphone" },
  { href: "/pod", label: "Plan of the Day", iconName: "ClipboardList", roles: ["officer", "snco", "cadet"] },
  { href: "/billets", label: "Billets", iconName: "Award", roles: ["officer", "snco", "cadet"] },
  { href: "/attendance", label: "Attendance", iconName: "ClipboardCheck", roles: ["officer", "snco", "nco"] },
  { href: "/cadets", label: "Cadets", iconName: "Users", roles: ["officer", "snco"] },
  { href: "/divisions", label: "Divisions", iconName: "Layers", roles: ["officer", "snco"] },
  { href: "/profile", label: "My Profile", iconName: "User", roles: ["cadet", "parent"] },
  { href: "/documents", label: "Documents", iconName: "FolderOpen", roles: ["officer", "snco", "nco", "cadet"] },
  { href: "/gallery", label: "Photo Gallery", iconName: "Images", roles: ["officer", "snco", "nco", "cadet"] },
  { href: "/admin", label: "Admin", iconName: "ShieldCheck", roles: ["officer"] },
];

export function navForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
