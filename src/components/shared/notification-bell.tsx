"use client";

import { useEffect, useState } from "react";
import { Bell, AlertTriangle, Shirt, TrendingUp, Info, Check, X, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import type { Notification, NotificationType } from "@/types/database";

const TYPE_CONFIG: Record<NotificationType, { icon: React.ElementType; color: string; bg: string }> = {
  correction:       { icon: AlertTriangle, color: "text-red-600",    bg: "bg-red-50" },
  inspection_fail:  { icon: Shirt,         color: "text-amber-600",  bg: "bg-amber-50" },
  inspection_pass:  { icon: Check,         color: "text-green-600",  bg: "bg-green-50" },
  pip_opened:       { icon: TrendingUp,    color: "text-orange-600", bg: "bg-orange-50" },
  rank_advance:     { icon: Star,          color: "text-yellow-600", bg: "bg-yellow-50" },
  general:          { icon: Info,          color: "text-blue-600",   bg: "bg-blue-50" },
};

export function NotificationBell({ profileId }: { profileId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setNotifications(data ?? []));

    const channel = supabase
      .channel("notifications-bell")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `profile_id=eq.${profileId}` },
        ({ new: row }) => {
          setNotifications((prev) => [row as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profileId]);

  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (!unreadIds.length) return;
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    // Dot persists until user explicitly dismisses or marks all read
  };

  const dismiss = async (id: string) => {
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700">
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-xl" sideOffset={8}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">Notifications</p>
          {notifications.some((n) => !n.read) && (
            <button onClick={markAllRead} className="text-xs text-[#003087] hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto divide-y">
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">No notifications yet.</p>
          ) : (
            notifications.map((n) => {
              const cfg = TYPE_CONFIG[n.type];
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors ${n.read ? "bg-white" : "bg-blue-50/40"}`}
                >
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold leading-snug text-gray-900">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 text-[12px] text-gray-500 line-clamp-2">{n.body}</p>
                    )}
                    <p className="mt-1 text-[11px] text-gray-400">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && (
                    <button onClick={() => dismiss(n.id)} className="mt-1 shrink-0 text-gray-300 hover:text-gray-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
