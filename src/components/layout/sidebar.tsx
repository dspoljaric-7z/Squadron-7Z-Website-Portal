"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Anchor,
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
};

const ROLE_COLORS: Record<string, string> = {
  officer: "text-[#B8860B]",
  snco: "text-purple-400",
  nco: "text-amber-400",
  cadet: "text-blue-300",
  parent: "text-gray-400",
};

export function Sidebar({
  items,
  unitName,
  role,
  fullName,
  initialPendingCount = 0,
}: {
  items: NavItem[];
  unitName: string;
  role?: UserRole;
  fullName?: string;
  initialPendingCount?: number;
}) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(initialPendingCount);

  useEffect(() => {
    if (role !== "officer") return;
    const supabase = createClient();
    const channel = supabase
      .channel("sidebar-pending")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("approved", false)
          .then(({ count }) => setPendingCount(count ?? 0));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [role]);

  return (
    <aside className="hidden w-64 flex-col bg-[#060e1e] md:flex" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>

      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              background: "rgba(184,134,11,0.1)",
              boxShadow: "0 0 0 1px rgba(184,134,11,0.3), 0 0 12px rgba(184,134,11,0.15)",
            }}
          >
            <Anchor className="h-4.5 w-4.5 text-[#B8860B]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold leading-tight text-white">{unitName}</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-white/30">
              NSCC Portal
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
          const Icon = ICONS[item.iconName];
          return (
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
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {role && (
          <div className="mb-2 px-3 py-2">
            <p className="truncate text-[13px] font-medium text-white/60">{fullName ?? "Member"}</p>
            <p className={cn("text-[11px] font-semibold uppercase tracking-wider", ROLE_COLORS[role] ?? "text-white/40")}>
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
