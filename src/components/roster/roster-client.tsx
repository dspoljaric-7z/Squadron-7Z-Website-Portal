"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { DutyRoster, Event, Profile } from "@/types/database";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const UNASSIGNED = "unassigned";

export function RosterClient({
  profile,
  events,
  cadets,
  canEdit,
}: {
  profile: Profile;
  events: Event[];
  cadets: Profile[];
  canEdit: boolean;
}) {
  const [eventId, setEventId] = useState<string>(events[0]?.id ?? "");
  const [rows, setRows] = useState<DutyRoster[]>([]);
  const [newRole, setNewRole] = useState("");

  const cadetsById = useMemo(() => {
    const map = new Map<string, Profile>();
    cadets.forEach((c) => map.set(c.id, c));
    return map;
  }, [cadets]);

  useEffect(() => {
    if (!eventId) return;
    const supabase = createClient();

    supabase.from("duty_roster").select("*").eq("event_id", eventId).order("created_at").then(({ data }) => setRows(data ?? []));

    const channel = supabase
      .channel(`roster-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "duty_roster", filter: `event_id=eq.${eventId}` }, () => {
        supabase.from("duty_roster").select("*").eq("event_id", eventId).order("created_at").then(({ data }) => setRows(data ?? []));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const [savingRow, setSavingRow] = useState<string | null>(null);

  const assignCadet = async (rowId: string, cadetId: string) => {
    const supabase = createClient();
    setSavingRow(rowId);
    const { error } = await supabase
      .from("duty_roster")
      .update({ cadet_id: cadetId === UNASSIGNED ? null : cadetId })
      .eq("id", rowId);
    if (error) {
      toast.error("Failed to update assignment");
    } else {
      toast.success("Assignment updated");
    }
    setSavingRow(null);
  };

  const addRow = async () => {
    if (!newRole.trim()) return;
    const supabase = createClient();
    const { error } = await supabase.from("duty_roster").insert({
      event_id: eventId,
      duty_role: newRole.trim(),
      created_by: profile.id,
    });
    if (error) { toast.error("Failed to add duty"); return; }
    setNewRole("");
  };

  const removeRow = async (rowId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("duty_roster").delete().eq("id", rowId);
    if (error) toast.error("Failed to remove duty");
    else toast.success("Duty removed");
  };

  const selectedEvent = events.find((e) => e.id === eventId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#003087]">Duty Roster / Watch Bill</h1>
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
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" /> Export to PDF
          </Button>
        </div>
      </div>

      {selectedEvent && (
        <div>
          <h2 className="text-lg font-semibold">{selectedEvent.title}</h2>
          <p className="text-sm text-gray-500">{format(new Date(selectedEvent.start_time), "EEEE, MMM d, yyyy")}</p>
        </div>
      )}

      <Card className="divide-y">
        {rows.map((row) => {
          const isMine = row.cadet_id === profile.id;
          return (
            <div key={row.id} className={cn("flex items-center justify-between gap-3 p-3", isMine && "bg-amber-50")}>
              <div className="font-medium">
                {row.duty_role}
                {isMine && <span className="ml-2 rounded bg-[#B8860B] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">You</span>}
              </div>
              {canEdit ? (
                <div className="flex items-center gap-2">
                  {savingRow === row.id && <span className="text-xs text-gray-400">Saving...</span>}
                  <Select value={row.cadet_id ?? UNASSIGNED} onValueChange={(v) => assignCadet(row.id, v ?? UNASSIGNED)}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                      {cadets.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button onClick={() => removeRow(row.id)} className="text-gray-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <span className="text-sm text-gray-700">
                  {row.cadet_id ? cadetsById.get(row.cadet_id)?.full_name ?? "Assigned" : "Unassigned"}
                </span>
              )}
            </div>
          );
        })}
        {rows.length === 0 && <p className="p-4 text-sm text-gray-400">No duty assignments for this event yet.</p>}
      </Card>

      {canEdit && (
        <div className="flex gap-2 print:hidden">
          <Input placeholder="New duty / station name" value={newRole} onChange={(e) => setNewRole(e.target.value)} />
          <Button className="bg-[#003087] hover:bg-[#002266]" onClick={addRow}>
            <Plus className="mr-1 h-4 w-4" /> Add Duty
          </Button>
        </div>
      )}
    </div>
  );
}
