"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, List, Grid3x3, Ship, X } from "lucide-react";
import { cn } from "@/lib/utils";

type TswEntry = {
  id: string;
  date: string;
  title: string;
  location: string | null;
  plan: string | null;
  notes: string | null;
};

export function CalendarClient({
  initialEvents,
  initialTswEntries = [],
  canEdit,
  profileId,
}: {
  initialEvents: Event[];
  initialTswEntries?: TswEntry[];
  canEdit: boolean;
  profileId?: string;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [tswEntries, setTswEntries] = useState<TswEntry[]>(initialTswEntries);
  const [view, setView] = useState<"month" | "list">("month");
  const [month, setMonth] = useState(new Date());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedTsw, setSelectedTsw] = useState<TswEntry | null>(null);

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
      .on("postgres_changes", { event: "*", schema: "public", table: "tsw_calendar" }, () => {
        supabase
          .from("tsw_calendar")
          .select("*")
          .order("date", { ascending: true })
          .then(({ data }) => data && setTswEntries((data as TswEntry[]) ?? []));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  const eventsByDay = (day: Date) => events.filter((e) => isSameDay(new Date(e.start_time), day));
  const tswByDay = (day: Date) =>
    tswEntries.filter((t) => isSameDay(parseISO(t.date), day));

  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const upcomingEvents = events.filter((e) => new Date(e.start_time) >= today);
  const upcomingTsw = tswEntries.filter((t) => parseISO(t.date) >= today);

  // Merged + sorted list for list view
  type ListItem = { date: Date; key: string } & (
    | { kind: "event"; event: Event }
    | { kind: "tsw"; tsw: TswEntry }
  );
  const listItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [
      ...upcomingEvents.map((e) => ({ kind: "event" as const, event: e, date: new Date(e.start_time), key: `e-${e.id}` })),
      ...upcomingTsw.map((t) => ({ kind: "tsw" as const, tsw: t, date: parseISO(t.date), key: `t-${t.id}` })),
    ];
    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [upcomingEvents, upcomingTsw]);

  const openNew = () => { setEditingEvent(null); setDrawerOpen(true); };
  const openEdit = (e: Event) => { setEditingEvent(e); setDrawerOpen(true); };

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

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-200" /> SQ7Z Events
        </span>
        <span className="flex items-center gap-1.5">
          <Ship className="h-3 w-3 text-amber-600" /> TSW Events
        </span>
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
              const dayTsw = tswByDay(day);
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
                    {dayTsw.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTsw(t)}
                        className="block w-full truncate rounded bg-amber-100 px-1 py-0.5 text-left text-[10px] text-amber-800 hover:bg-amber-200"
                      >
                        ⚓ {t.title}
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
          {listItems.length === 0 && <p className="text-sm text-gray-400">No upcoming events.</p>}
          {listItems.map((item) =>
            item.kind === "event" ? (
              <Card
                key={item.key}
                className="flex cursor-pointer items-center justify-between p-4"
                onClick={() => openEdit(item.event)}
              >
                <div>
                  <p className="font-semibold">{item.event.title}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(item.event.start_time), "EEE, MMM d 'at' h:mm a")}
                    {item.event.location && ` · ${item.event.location}`}
                  </p>
                  {item.event.description && (
                    <p className="mt-1 text-sm text-gray-600">{item.event.description}</p>
                  )}
                </div>
                <span className={cn("shrink-0 rounded px-2 py-1 text-xs font-medium", EVENT_TYPE_COLORS[item.event.event_type])}>
                  {EVENT_TYPE_LABELS[item.event.event_type]}
                </span>
              </Card>
            ) : (
              <Card
                key={item.key}
                className="flex cursor-pointer items-center justify-between p-4 border-l-4 border-l-amber-400"
                onClick={() => setSelectedTsw(item.tsw)}
              >
                <div>
                  <p className="font-semibold">{item.tsw.title}</p>
                  <p className="text-sm text-gray-500">
                    {format(parseISO(item.tsw.date), "EEE, MMM d")}
                    {item.tsw.location && ` · ${item.tsw.location}`}
                  </p>
                  {item.tsw.notes && <p className="mt-1 text-sm text-gray-600">{item.tsw.notes}</p>}
                </div>
                <Badge variant="outline" className="shrink-0 border-amber-400 bg-amber-50 text-amber-700">
                  <Ship className="mr-1 h-3 w-3" /> TSW
                </Badge>
              </Card>
            )
          )}
        </div>
      )}

      {/* TSW detail dialog */}
      {selectedTsw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedTsw(null)}>
          <Card className="w-full max-w-md space-y-3 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Ship className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">TSW Event</span>
                </div>
                <h2 className="text-lg font-bold">{selectedTsw.title}</h2>
                <p className="text-sm text-gray-500">
                  {format(parseISO(selectedTsw.date), "EEEE, MMMM d, yyyy")}
                  {selectedTsw.location && ` · ${selectedTsw.location}`}
                </p>
              </div>
              <button onClick={() => setSelectedTsw(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {selectedTsw.plan && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Plan of the Day</p>
                <p className="whitespace-pre-wrap text-sm text-gray-700">{selectedTsw.plan}</p>
              </div>
            )}
            {selectedTsw.notes && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Notes</p>
                <p className="whitespace-pre-wrap text-sm text-gray-600">{selectedTsw.notes}</p>
              </div>
            )}
          </Card>
        </div>
      )}

      <EventDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        event={editingEvent}
        onSaved={() => {}}
        onDeleted={() => {}}
        readOnly={!canEdit}
        profileId={profileId}
        canEdit={canEdit}
      />
    </div>
  );
}
