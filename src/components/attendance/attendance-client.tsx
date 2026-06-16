"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ATTENDANCE_COLORS } from "@/lib/constants";
import { initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Attendance, AttendanceStatus, Event, Profile } from "@/types/database";
import { format } from "date-fns";

const STATUSES: AttendanceStatus[] = ["present", "absent", "excused"];

export function AttendanceClient({
  profile,
  events,
  cadets,
}: {
  profile: Profile;
  events: Event[];
  cadets: Profile[];
}) {
  const [eventId, setEventId] = useState<string>(events[0]?.id ?? "");
  const [records, setRecords] = useState<Attendance[]>([]);
  const [editingBy, setEditingBy] = useState<Record<string, string>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);

  const recordsByCadet = useMemo(() => {
    const map = new Map<string, Attendance>();
    records.forEach((r) => map.set(r.cadet_id, r));
    return map;
  }, [records]);

  const locked = records.length > 0 && records.every((r) => r.locked);

  useEffect(() => {
    if (!eventId) return;
    const supabase = createClient();

    supabase
      .from("attendance")
      .select("*")
      .eq("event_id", eventId)
      .then(({ data }) => setRecords(data ?? []));

    const channel = supabase
      .channel(`attendance-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance", filter: `event_id=eq.${eventId}` }, () => {
        supabase.from("attendance").select("*").eq("event_id", eventId).then(({ data }) => setRecords(data ?? []));
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const map: Record<string, string> = {};
        Object.values(state).forEach((presences) => {
          presences.forEach((p) => {
            const meta = p as unknown as { cadet_id?: string; name?: string };
            if (meta.cadet_id) map[meta.cadet_id] = meta.name ?? "Someone";
          });
        });
        setEditingBy(map);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [eventId]);

  const setStatus = async (cadetId: string, status: AttendanceStatus) => {
    if (locked) return;
    const supabase = createClient();
    const existing = recordsByCadet.get(cadetId);

    setRecords((prev) => {
      const next = prev.filter((r) => r.cadet_id !== cadetId);
      return [...next, { id: existing?.id ?? "temp", event_id: eventId, cadet_id: cadetId, status, locked: false, recorded_by: profile.id, recorded_at: new Date().toISOString() }];
    });

    const { error } = await supabase
      .from("attendance")
      .upsert({ event_id: eventId, cadet_id: cadetId, status, recorded_by: profile.id, recorded_at: new Date().toISOString() }, { onConflict: "event_id,cadet_id" });

    if (error) toast.error("Failed to save: " + error.message);
  };

  const focusCadet = async (cadetId: string | null) => {
    await channelRef.current?.track({ cadet_id: cadetId, name: profile.full_name });
  };

  const submitAndLock = async () => {
    const supabase = createClient();
    const { error } = await supabase.from("attendance").update({ locked: true }).eq("event_id", eventId);
    if (error) { toast.error("Failed to lock"); return; }
    toast.success("Attendance submitted and locked");
  };

  const unlock = async () => {
    const supabase = createClient();
    const { error } = await supabase.from("attendance").update({ locked: false }).eq("event_id", eventId);
    if (error) { toast.error("Failed to unlock"); return; }
    toast.success("Attendance unlocked for editing");
  };

  const selectedEvent = events.find((e) => e.id === eventId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#003087]">Attendance</h1>
          <LiveIndicator />
        </div>
        <div className="flex items-center gap-2">
          <Select value={eventId} onValueChange={(v) => setEventId(v ?? "")}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select an event" /></SelectTrigger>
            <SelectContent>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title} &mdash; {format(new Date(e.start_time), "MMM d, yyyy")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {locked ? (
            <Button variant="outline" onClick={unlock}>
              <Unlock className="mr-1 h-4 w-4" /> Unlock
            </Button>
          ) : (
            <Button className="bg-[#003087] hover:bg-[#002266]" onClick={submitAndLock}>
              <Lock className="mr-1 h-4 w-4" /> Submit &amp; Lock
            </Button>
          )}
        </div>
      </div>

      {selectedEvent && (
        <p className="text-sm text-gray-500">
          Taking attendance for <span className="font-medium">{selectedEvent.title}</span> on{" "}
          {format(new Date(selectedEvent.start_time), "EEEE, MMM d, yyyy")}
          {locked && <span className="ml-2 font-medium text-[#B8860B]">(Locked)</span>}
        </p>
      )}

      <Card className="divide-y">
        {cadets.map((cadet) => {
          const record = recordsByCadet.get(cadet.id);
          const status = record?.status ?? "absent";
          const editor = editingBy[cadet.id];
          return (
            <div key={cadet.id} className="flex items-center justify-between gap-3 p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[#003087] text-xs text-white">{initials(cadet.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{cadet.full_name}</p>
                  <p className="text-xs text-gray-400">{cadet.rank ?? "Cadet"}{cadet.billet ? ` · ${cadet.billet}` : ""}</p>
                </div>
                {editor && editor !== profile.full_name && (
                  <span className="text-xs italic text-[#B8860B]">being edited by {editor}</span>
                )}
              </div>
              <div className="flex gap-1">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    disabled={locked}
                    onClick={() => { focusCadet(cadet.id); setStatus(cadet.id, s); }}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs font-medium capitalize transition-colors disabled:opacity-50",
                      status === s ? ATTENDANCE_COLORS[s] : "border-gray-200 text-gray-400 hover:bg-gray-50"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {cadets.length === 0 && <p className="p-4 text-sm text-gray-400">No active cadets found.</p>}
      </Card>
    </div>
  );
}
