"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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

export function MobileNav({
  items,
  role,
  initialPendingCount = 0,
}: {
  items: NavItem[];
  role?: UserRole;
  initialPendingCount?: number;
}) {
  const pathname = usePathname();
  const visible = items.slice(0, 5);
  const [pendingCount, setPendingCount] = useState(initialPendingCount);

  useEffect(() => {
    if (role !== "officer") return;
    const supabase = createClient();
    const channel = supabase
      .channel("mobilenav-pending")
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
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-white/5 bg-[#060e1e] md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {visible.map((item) => {
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
        const Icon = ICONS[item.iconName];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-wider transition-colors",
              active ? "text-[#B8860B]" : "text-white/30"
            )}
          >
            {active && (
              <span className="absolute top-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-b bg-[#B8860B]" />
            )}
            <span className="relative">
              <Icon className="h-5 w-5" />
              {item.href === "/admin" && pendingCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#B8860B] px-1 text-[8px] font-bold text-black">
                  {pendingCount}
                </span>
              )}
            </span>
            <span className="leading-none">{item.label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
