"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EventDrawer } from "@/components/calendar/event-drawer";
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from "@/lib/constants";
import type { Event } from "@/types/database";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, List, Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function CalendarClient({ initialEvents, canEdit }: { initialEvents: Event[]; canEdit: boolean }) {
  const [events, setEvents] = useState(initialEvents);
  const [view, setView] = useState<"month" | "list">("month");
  const [month, setMonth] = useState(new Date());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("calendar-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        supabase
          .from("events")
          .select("*")
          .order("start_time", { ascending: true })
          .then(({ data }) => data && setEvents(data));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  const eventsByDay = (day: Date) => events.filter((e) => isSameDay(new Date(e.start_time), day));

  const upcoming = events.filter((e) => new Date(e.start_time) >= new Date(new Date().setHours(0, 0, 0, 0)));

  const openNew = () => {
    setEditingEvent(null);
    setDrawerOpen(true);
  };

  const openEdit = (e: Event) => {
    setEditingEvent(e);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#003087]">Training Schedule</h1>
          <LiveIndicator />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border bg-white p-0.5">
            <button
              onClick={() => setView("month")}
              className={cn("rounded-sm p-1.5", view === "month" ? "bg-[#003087] text-white" : "text-gray-500")}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn("rounded-sm p-1.5", view === "list" ? "bg-[#003087] text-white" : "text-gray-500")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          {canEdit && (
            <Button className="bg-[#003087] hover:bg-[#002266]" onClick={openNew}>
              <Plus className="mr-1 h-4 w-4" /> New Event
            </Button>
          )}
        </div>
      </div>

      {view === "month" ? (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <button onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft className="h-5 w-5" /></button>
            <h2 className="font-semibold">{format(month, "MMMM yyyy")}</h2>
            <button onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-5 w-5" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayEvents = eventsByDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[70px] rounded-md border p-1 text-xs",
                    !isSameMonth(day, month) && "bg-gray-50 text-gray-400",
                    isSameDay(day, new Date()) && "border-[#003087]"
                  )}
                >
                  <div className="mb-1 font-medium">{format(day, "d")}</div>
                  <div className="space-y-0.5">
                    {dayEvents.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => openEdit(e)}
                        className={cn("block w-full truncate rounded px-1 py-0.5 text-left text-[10px]", EVENT_TYPE_COLORS[e.event_type])}
                      >
                        {e.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {upcoming.length === 0 && <p className="text-sm text-gray-400">No upcoming events.</p>}
          {upcoming.map((e) => (
            <Card key={e.id} className="flex cursor-pointer items-center justify-between p-4" onClick={() => openEdit(e)}>
              <div>
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm text-gray-500">
                  {format(new Date(e.start_time), "EEE, MMM d 'at' h:mm a")}
                  {e.location && ` · ${e.location}`}
                </p>
                {e.description && <p className="mt-1 text-sm text-gray-600">{e.description}</p>}
              </div>
              <span className={cn("shrink-0 rounded px-2 py-1 text-xs font-medium", EVENT_TYPE_COLORS[e.event_type])}>
                {EVENT_TYPE_LABELS[e.event_type]}
              </span>
            </Card>
          ))}
        </div>
      )}

      <EventDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        event={editingEvent}
        onSaved={() => {}}
        onDeleted={() => {}}
        readOnly={!canEdit}
      />
    </div>
  );
}
