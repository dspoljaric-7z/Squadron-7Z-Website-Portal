"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UnitLogo } from "@/components/shared/unit-logo";
import {
  LogOut,
  LayoutDashboard,
  CalendarDays,
  Megaphone,
  ClipboardCheck,
  Users,
  User,
  FolderOpen,
  Images,
  ShieldCheck,
  ClipboardList,
  Award,
  Layers,
  Network,
  CheckSquare,
  Search,
  TrendingUp,
  Shirt,
  AlertTriangle,
  FileWarning,
  Lightbulb,
  UserPlus,
  Key,
  Calendar,
  Database,
  Settings,
  BookOpen,
  Trophy,
  Shield,
  FileCheck,
  History,
  CalendarOff,
  GanttChart,
  Map,
  ScrollText,
  DoorOpen,
  BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/app/(auth)/actions";
import type { NavItem, NavIconName } from "@/lib/nav";
import type { UserRole } from "@/types/database";
import { roleLabel } from "@/lib/format";

const ICONS: Record<NavIconName, React.ElementType> = {
  LayoutDashboard,
  CalendarDays,
  Megaphone,
  ClipboardCheck,
  Users,
  User,
  FolderOpen,
  Images,
  ShieldCheck,
  ClipboardList,
  Award,
  Layers,
  Network,
  CheckSquare,
  Search,
  TrendingUp,
  Shirt,
  AlertTriangle,
  FileWarning,
  Lightbulb,
  UserPlus,
  Key,
  Calendar,
  Database,
  Settings,
  BookOpen,
  Trophy,
  Shield,
  ClipboardList2: ClipboardList,
  FileCheck,
  History,
  CalendarOff,
  GanttChart,
  Map,
  ScrollText,
  DoorOpen,
  BarChart2,
};

const ROLE_COLORS: Record<string, string> = {
  officer: "text-[#B8860B]",
  snco: "text-purple-400",
  nco: "text-amber-400",
  cadet: "text-blue-300",
};

export function Sidebar({
  items,
  unitName,
  role,
  fullName,
  title,
  initialPendingCount = 0,
  initialPendingPodCount = 0,
  initialPendingAbsenceCount = 0,
  initialUnreadAnnouncementsCount = 0,
  initialIncompleteOnboardingCount = 0,
  profileId,
}: {
  items: NavItem[];
  unitName: string;
  role?: UserRole;
  fullName?: string;
  title?: string | null;
  initialPendingCount?: number;
  initialPendingPodCount?: number;
  initialPendingAbsenceCount?: number;
  initialUnreadAnnouncementsCount?: number;
  initialIncompleteOnboardingCount?: number;
  profileId?: string;
}) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(initialPendingCount);
  const [pendingPodCount, setPendingPodCount] = useState(initialPendingPodCount);
  const [pendingAbsenceCount, setPendingAbsenceCount] = useState(initialPendingAbsenceCount);
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(initialUnreadAnnouncementsCount);
  const [incompleteOnboardingCount, setIncompleteOnboardingCount] = useState(initialIncompleteOnboardingCount);

  useEffect(() => {
    const supabase = createClient();
    const channels: ReturnType<typeof supabase.channel>[] = [];

    if (role === "officer") {
      channels.push(
        supabase.channel("sidebar-pending")
          .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
            supabase.from("profiles").select("id", { count: "exact", head: true }).eq("approved", false)
              .then(({ count }) => setPendingCount(count ?? 0));
          }).subscribe(),
        supabase.channel("sidebar-pending-pods")
          .on("postgres_changes", { event: "*", schema: "public", table: "plan_of_day" }, () => {
            supabase.from("plan_of_day" as never).select("id", { count: "exact", head: true }).eq("status", "submitted")
              .then(({ count }: { count: number | null }) => setPendingPodCount(count ?? 0));
          }).subscribe(),
      );
    }

    if (role === "officer" || role === "snco" || role === "nco") {
      channels.push(
        supabase.channel("sidebar-pending-absences")
          .on("postgres_changes", { event: "*", schema: "public", table: "absence_requests" }, () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase as any).from("absence_requests").select("id", { count: "exact", head: true }).eq("status", "pending")
              .then(({ count }: { count: number | null }) => setPendingAbsenceCount(count ?? 0));
          }).subscribe(),
      );
    }

    // Announcements unread — everyone
    if (profileId) {
      channels.push(
        supabase.channel("sidebar-announcements")
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, () => {
            setUnreadAnnouncementsCount((n) => n + 1);
          })
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcement_reads" }, (payload) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((payload.new as any)?.profile_id === profileId) {
              setUnreadAnnouncementsCount((n) => Math.max(0, n - 1));
            }
          }).subscribe(),
      );
    }

    // Onboarding completions for cadets
    if (role === "cadet" && profileId) {
      channels.push(
        supabase.channel("sidebar-onboarding")
          .on("postgres_changes", { event: "*", schema: "public", table: "cadet_onboarding" }, () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase as any).from("cadet_onboarding")
              .select("step_id", { count: "exact", head: false })
              .eq("cadet_id", profileId)
              .eq("completed", true)
              .then(({ data }: { data: { step_id: string }[] | null }) => {
                const completedIds = new Set((data ?? []).map((r) => r.step_id));
                // Re-fetch required steps and compute incomplete
                supabase.from("onboarding_steps" as never)
                  .select("id")
                  .eq("active", true)
                  .eq("required", true)
                  .then(({ data: steps }: { data: { id: string }[] | null }) => {
                    const incomplete = (steps ?? []).filter((s) => !completedIds.has(s.id)).length;
                    setIncompleteOnboardingCount(incomplete);
                  });
              });
          }).subscribe(),
      );
    }

    return () => { channels.forEach((c) => supabase.removeChannel(c)); };
  }, [role, profileId]);

  return (
    <aside className="hidden w-64 flex-col bg-[#0d1f3c] md:flex" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>

      {/* Logo */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          {/* Unit seal */}
          <div className="shrink-0">
            <UnitLogo size={44} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold leading-tight text-white">{unitName}</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-white/30">
              NSCC · SQ7-Z
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {items.reduce<{ section: string | undefined; els: React.ReactNode[] }>(
          (acc, item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
            const Icon = ICONS[item.iconName];
            if (item.section && item.section !== acc.section) {
              acc.section = item.section;
              acc.els.push(
                <p key={`section-${item.section}`} className="mt-4 mb-1 px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-white/20 first:mt-0">
                  {item.section}
                </p>
              );
            }
            acc.els.push(
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "nav-active-glow-target relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
                  active
                    ? "bg-[#B8860B]/10 text-[#B8860B] nav-active-glow"
                    : "text-white/45 hover:bg-white/[0.04] hover:text-white/75"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-[#B8860B]" />
                )}
                <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[#B8860B]" : "")} />
                <span className="truncate">{item.label}</span>
                {item.href === "/admin" && pendingCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B8860B] px-1.5 text-[10px] font-bold text-black">
                    {pendingCount}
                  </span>
                )}
                {item.href === "/pod" && pendingPodCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                    {pendingPodCount}
                  </span>
                )}
                {item.href === "/absence-requests" && pendingAbsenceCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                    {pendingAbsenceCount}
                  </span>
                )}
                {item.href === "/announcements" && unreadAnnouncementsCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white">
                    {unreadAnnouncementsCount}
                  </span>
                )}
                {item.href === "/onboarding" && incompleteOnboardingCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {incompleteOnboardingCount}
                  </span>
                )}
              </Link>
            );
            return acc;
          },
          { section: undefined, els: [] }
        ).els}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {role && (
          <div className="mb-2 px-3 py-2">
            <p className="truncate text-[13px] font-medium text-white/70">{fullName ?? "Member"}</p>
            {title && (
              <p className="truncate text-[11px] text-white/45">{title}</p>
            )}
            <p className={cn("text-[11px] font-semibold uppercase tracking-wider mt-0.5", ROLE_COLORS[role] ?? "text-white/40")}>
              {roleLabel(role)}
            </p>
          </div>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-white/35 transition-colors hover:bg-white/[0.04] hover:text-white/60"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </form>
      </div>
    </aside>
  );
}
