"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ATTENDANCE_COLORS } from "@/lib/constants";
import { initials, lastFirst, byLastName, roleLabel, ROLE_ORDER } from "@/lib/format";
import { isOfficer } from "@/lib/permissions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Lock, Unlock, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Attendance, AttendanceStatus, Event, Profile } from "@/types/database";
import { format } from "date-fns";

const STATUSES: AttendanceStatus[] = ["present", "absent", "excused"];

const ROLE_SECTION_COLORS: Record<string, string> = {
  officer: "text-[#003087]",
  snco: "text-purple-700",
  nco: "text-[#B8860B]",
  cadet: "text-gray-600",
};

export function AttendanceClient({
  profile,
  events,
  members,
}: {
  profile: Profile;
  events: Event[];
  members: Profile[];
}) {
  const [eventId, setEventId] = useState<string>(events[0]?.id ?? "");
  const [records, setRecords] = useState<Attendance[]>([]);
  const [editingBy, setEditingBy] = useState<Record<string, string>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);

  const recordsByMember = useMemo(() => {
    const map = new Map<string, Attendance>();
    records.forEach((r) => map.set(r.cadet_id, r));
    return map;
  }, [records]);

  const locked = records.length > 0 && records.every((r) => r.locked);
  const canLock = isOfficer(profile);
  const selectedEvent = events.find((e) => e.id === eventId);

  // Group members by role, sorted by role rank then name
  const membersByRole = useMemo(() => {
    const groups: Record<string, Profile[]> = {};
    [...members]
      .sort((a, b) => {
        const roleDiff = (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99);
        return roleDiff !== 0 ? roleDiff : byLastName(a, b);
      })
      .forEach((m) => {
        if (!groups[m.role]) groups[m.role] = [];
        groups[m.role].push(m);
      });
    return groups;
  }, [members]);

  const stats = useMemo(() => {
    const present = records.filter((r) => r.status === "present").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const excused = records.filter((r) => r.status === "excused").length;
    const unmarked = members.length - records.length;
    return { present, absent, excused, unmarked, total: members.length };
  }, [records, members]);

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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance", filter: `event_id=eq.${eventId}` },
        () => {
          supabase
            .from("attendance")
            .select("*")
            .eq("event_id", eventId)
            .then(({ data }) => setRecords(data ?? []));
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const map: Record<string, string> = {};
        Object.values(state).forEach((presences) => {
          presences.forEach((p) => {
            const meta = p as unknown as { member_id?: string; name?: string };
            if (meta.member_id) map[meta.member_id] = meta.name ?? "Someone";
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

  const setStatus = async (memberId: string, status: AttendanceStatus) => {
    if (locked || !eventId) return;
    const supabase = createClient();
    const existing = recordsByMember.get(memberId);

    setRecords((prev) => {
      const next = prev.filter((r) => r.cadet_id !== memberId);
      return [
        ...next,
        {
          id: existing?.id ?? "temp",
          event_id: eventId,
          cadet_id: memberId,
          status,
          locked: false,
          recorded_by: profile.id,
          recorded_at: new Date().toISOString(),
        },
      ];
    });

    const { error } = await supabase.from("attendance").upsert(
      {
        event_id: eventId,
        cadet_id: memberId,
        status,
        recorded_by: profile.id,
        recorded_at: new Date().toISOString(),
      },
      { onConflict: "event_id,cadet_id" }
    );

    if (error) toast.error("Failed to save: " + error.message);
  };

  const focusMember = async (memberId: string | null) => {
    await channelRef.current?.track({ member_id: memberId, name: profile.full_name });
  };

  const markAllPresent = async () => {
    if (!eventId) return;
    const supabase = createClient();
    const upserts = members.map((m) => ({
      event_id: eventId,
      cadet_id: m.id,
      status: "present" as AttendanceStatus,
      recorded_by: profile.id,
      recorded_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("attendance").upsert(upserts, { onConflict: "event_id,cadet_id" });
    if (error) { toast.error("Failed: " + error.message); return; }
    const { data } = await supabase.from("attendance").select("*").eq("event_id", eventId);
    setRecords(data ?? []);
    toast.success("All marked present");
  };

  const lockAttendance = async () => {
    if (!eventId) { toast.error("Select an event first"); return; }
    const supabase = createClient();
    const { error } = await supabase.from("attendance").update({ locked: true }).eq("event_id", eventId);
    if (error) { toast.error("Failed to lock"); return; }
    toast.success("Attendance locked");
  };

  const unlock = async () => {
    if (!eventId) return;
    const supabase = createClient();
    const { error } = await supabase.from("attendance").update({ locked: false }).eq("event_id", eventId);
    if (error) { toast.error("Failed to unlock"); return; }
    toast.success("Attendance unlocked");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#003087]">Attendance</h1>
          <LiveIndicator />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={eventId} onValueChange={(v) => v && setEventId(v)}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title} — {format(new Date(e.start_time), "MMM d, yyyy")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {eventId && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={markAllPresent}
                disabled={locked}
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                <ClipboardCheck className="mr-1 h-4 w-4" /> All Present
              </Button>
              {canLock ? (
                locked ? (
                  <Button variant="outline" size="sm" onClick={unlock} className="border-amber-300 text-amber-700 hover:bg-amber-50">
                    <Unlock className="mr-1 h-4 w-4" /> Unlock
                  </Button>
                ) : (
                  <Button size="sm" className="bg-[#003087] hover:bg-[#002266]" onClick={lockAttendance}>
                    <Lock className="mr-1 h-4 w-4" /> Lock Muster
                  </Button>
                )
              ) : locked ? (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                  <Lock className="mr-1 h-3 w-3" /> Locked by Officer
                </Badge>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Event info */}
      {selectedEvent && (
        <p className="text-sm text-gray-500">
          Muster for <span className="font-medium">{selectedEvent.title}</span> ·{" "}
          {format(new Date(selectedEvent.start_time), "EEEE, MMMM d, yyyy")}
          {locked && <span className="ml-2 font-semibold text-amber-600">· Locked</span>}
        </p>
      )}

      {/* Stat bar */}
      {eventId && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Present", value: stats.present, color: "text-green-700 bg-green-50 border-green-200" },
            { label: "Absent", value: stats.absent, color: "text-red-700 bg-red-50 border-red-200" },
            { label: "Excused", value: stats.excused, color: "text-amber-700 bg-amber-50 border-amber-200" },
            { label: "Unmarked", value: stats.unmarked, color: "text-gray-500 bg-gray-50 border-gray-200" },
          ].map((s) => (
            <div key={s.label} className={cn("rounded-lg border px-3 py-2 text-center", s.color)}>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Member roster grouped by role */}
      {!eventId ? (
        <Card className="p-8 text-center text-sm text-gray-400">Select an event above to take muster.</Card>
      ) : (
        <div className="space-y-3">
          {Object.entries(membersByRole).map(([role, roleMembers]) => (
            <Card key={role} className="overflow-hidden">
              <div className="border-b bg-gray-50 px-4 py-2">
                <span className={cn("text-xs font-bold uppercase tracking-widest", ROLE_SECTION_COLORS[role])}>
                  {roleLabel(role)}s
                </span>
                <span className="ml-2 text-xs text-gray-400">({roleMembers.length})</span>
              </div>
              <div className="divide-y">
                {roleMembers.map((member) => {
                  const record = recordsByMember.get(member.id);
                  const status = record?.status ?? null;
                  const editor = editingBy[member.id];
                  return (
                    <div key={member.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-[#003087] text-xs text-white">
                            {initials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{lastFirst(member.full_name)}</p>
                          <p className="text-xs text-gray-400">
                            {member.rank ?? roleLabel(member.role)}
                            {member.billet ? ` · ${member.billet}` : ""}
                          </p>
                        </div>
                        {editor && editor !== profile.full_name && (
                          <span className="text-xs italic text-[#B8860B]">editing: {editor}</span>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {STATUSES.map((s) => (
                          <button
                            key={s}
                            disabled={locked}
                            onClick={() => { focusMember(member.id); setStatus(member.id, s); }}
                            className={cn(
                              "rounded-md border px-2.5 py-1 text-xs font-medium capitalize transition-colors disabled:opacity-50",
                              status === s
                                ? ATTENDANCE_COLORS[s]
                                : "border-gray-200 text-gray-400 hover:bg-gray-50"
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
          {members.length === 0 && (
            <Card className="p-8 text-center text-sm text-gray-400">No active members found.</Card>
          )}
        </div>
      )}
    </div>
  );
}
