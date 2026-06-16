"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Announcement } from "@/types/database";

export function GlobalNotifications({ profileId }: { profileId: string }) {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("global-announcements")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        ({ new: row }) => {
          const a = row as Announcement;
          if (a.priority !== "urgent") return;
          if (a.posted_by === profileId) return;
          toast.error(`Urgent: ${a.title}`, {
            description: "New urgent announcement posted.",
            duration: 10000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  return null;
}
