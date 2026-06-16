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
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t bg-white md:hidden">
      {visible.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = ICONS[item.iconName];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium",
              active ? "text-[#003087]" : "text-gray-400"
            )}
          >
            <span className="relative">
              <Icon className="h-5 w-5" />
              {item.href === "/admin" && pendingCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#B8860B] px-1 text-[8px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
