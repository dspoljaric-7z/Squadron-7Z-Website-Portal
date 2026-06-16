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

export function Sidebar({
  items,
  unitName,
  role,
  initialPendingCount = 0,
}: {
  items: NavItem[];
  unitName: string;
  role?: UserRole;
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
    <aside className="hidden w-60 flex-col bg-[#003087] text-white md:flex">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
          <Anchor className="h-5 w-5 text-[#003087]" />
        </div>
        <span className="text-sm font-semibold leading-tight">{unitName}</span>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = ICONS[item.iconName];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              {item.href === "/admin" && pendingCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B8860B] px-1.5 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <form action={logout} className="border-t border-white/10 p-2">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </form>
    </aside>
  );
}
