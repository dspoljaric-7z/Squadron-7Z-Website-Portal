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
import { HintButton } from "@/components/shared/hint-button";
import { DrillDetailModal, type DrillModalEntry } from "@/components/calendar/drill-detail-modal";
import type { Profile } from "@/types/database";

const CALENDAR_HINTS = [
  { heading: "Adding an event", body: "Staff can click any date cell or the '+' button to create a new SQ7Z event. Fill in the title, type, time, and location, then Save." },
  { heading: "Color legend / filters", body: "Use the toggle pills to show or hide each category: SQ7Z Events (blue), TSW Events (orange), and Drills (blue — covers both SQ7Z and TSW drill dates)." },
  { heading: "Month vs. list view", body: "Switch between the grid calendar and a chronological list using the icons in the top-right corner." },
  { heading: "Drills on the calendar", body: "Blue pills show drill dates shared by SQ7Z and TSW. Themes come from the LRP and details update when the POD is filled out. Click any drill to see POD details, request absence, or go to muster." },
  { heading: "TSW Events", body: "TSW calendar entries (teal) are managed on the TSW Plan of Day page. TSW drill dates come from the TSW Long-Range Plan." },
];

type TswEntry = {
  id: string;
  date: string;
  title: string;
  location: string | null;
  plan: string | null;
  notes: string | null;
};

type LrpRow = { id: string; week_start: string; theme: string | null };
type TswLrpRow = { id: string; date: string; theme: string | null; notes?: string | null };
type DrillSession = { id: string; date: string; locked: boolean };
type PodRow = { id: string; date: string; training_objective: string | null; notes: string | null; status?: string | null };

const FILTER_STORAGE_KEY = "sq7z-calendar-filters";

export function CalendarClient({
  initialEvents,
  initialTswEntries = [],
  initialLrpRows = [],
  initialTswLrpRows = [],
  initialDrillSessions = [],
  initialPodRows = [],
  podStatusByDate = {},
  absenceCountsByDate = {},
  canEdit,
  profileId,
  profile,
}: {
  initialEvents: Event[];
  initialTswEntries?: TswEntry[];
  initialLrpRows?: LrpRow[];
  initialTswLrpRows?: TswLrpRow[];
  initialDrillSessions?: DrillSession[];
  initialPodRows?: PodRow[];
  podStatusByDate?: Record<string, string | null>;
  absenceCountsByDate?: Record<string, number>;
  canEdit: boolean;
  profileId?: string;
  profile?: Profile;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [tswEntries, setTswEntries] = useState<TswEntry[]>(initialTswEntries);

  // Persist filter state to localStorage
  const [showSq7z, setShowSq7z] = useState(() => {
    try { const s = localStorage.getItem(FILTER_STORAGE_KEY); return s ? JSON.parse(s).sq7z ?? true : true; } catch { return true; }
  });
  const [showTsw, setShowTsw] = useState(() => {
    try { const s = localStorage.getItem(FILTER_STORAGE_KEY); return s ? JSON.parse(s).tsw ?? true : true; } catch { return true; }
  });
  const [showDrills, setShowDrills] = useState(() => {
    try { const s = localStorage.getItem(FILTER_STORAGE_KEY); return s ? JSON.parse(s).drills ?? true : true; } catch { return true; }
  });

  useEffect(() => {
    try { localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({ sq7z: showSq7z, tsw: showTsw, drills: showDrills })); } catch { /* ignore */ }
  }, [showSq7z, showTsw, showDrills]);

  // Build merged SQ7Z drill entries: drill_sessions enriched with LRP theme + POD title
  const drillEntries = useMemo(() => {
    const podByDate = new Map(initialPodRows.map((p) => [p.date, p]));
    const drillByDate = new Map(initialDrillSessions.map((d) => [d.date, d]));

    // Union of all dates from drill_sessions and LRP weeks
    const allDates = new Set<string>([
      ...initialDrillSessions.map((d) => d.date),
      ...initialLrpRows.map((r) => r.week_start),
    ]);

    return Array.from(allDates).sort().map((date) => {
      const drill = drillByDate.get(date);
      const pod = podByDate.get(date);
      // Find LRP theme for this date (exact match on week_start, or find the LRP week containing this date)
      const lrp = initialLrpRows.find((r) => r.week_start === date);
      return {
        date,
        theme: lrp?.theme ?? null,
        title: pod?.training_objective ?? lrp?.theme ?? "SQ7Z Drill",
        notes: pod?.notes ?? null,
        hasSession: !!drill,
        locked: drill?.locked ?? false,
      };
    });
  }, [initialDrillSessions, initialLrpRows, initialPodRows]);
  const [view, setView] = useState<"month" | "list">("month");
  const [month, setMonth] = useState(new Date());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedTsw, setSelectedTsw] = useState<TswEntry | null>(null);
  const [selectedDrill, setSelectedDrill] = useState<DrillModalEntry | null>(null);

  // Keyboard navigation: left/right arrows for months, Escape closes modals
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "ArrowLeft") setMonth((m) => subMonths(m, 1));
      else if (e.key === "ArrowRight") setMonth((m) => addMonths(m, 1));
      else if (e.key === "Escape") { setSelectedDrill(null); setSelectedTsw(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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

  type TswDrillEntry = { id: string; date: string; theme: string | null; notes?: string | null; tswTitle?: string | null };

  // Merge TSW LRP dates with TSW calendar entries (POD details)
  const tswDrillEntries = useMemo<TswDrillEntry[]>(() => {
    const tswByDate = new Map(tswEntries.map((t) => [t.date, t]));
    return initialTswLrpRows.map((r) => {
      const tsw = tswByDate.get(r.date);
      return { ...r, tswTitle: tsw?.title ?? null, notes: tsw?.notes ?? r.notes };
    });
  }, [initialTswLrpRows, tswEntries]);

  // Merge SQ7Z + TSW drills by date into unified entries
  const mergedDrillsByDate = useMemo(() => {
    const tswByDate = new Map(tswDrillEntries.map((t) => [t.date, t]));
    const allDates = new Set([...drillEntries.map((d) => d.date), ...tswDrillEntries.map((t) => t.date)]);
    return Array.from(allDates).sort().map((date) => {
      const sq7z = drillEntries.find((d) => d.date === date);
      const tsw = tswByDate.get(date);
      return {
        date,
        title: sq7z?.title ?? tsw?.tswTitle ?? tsw?.theme ?? "Drill",
        theme: sq7z?.theme ?? tsw?.theme ?? null,
        notes: sq7z?.notes ?? tsw?.notes ?? null,
        hasSession: sq7z?.hasSession ?? false,
        locked: sq7z?.locked ?? false,
        hasTsw: !!tsw,
        hasSq7z: !!sq7z,
      };
    });
  }, [drillEntries, tswDrillEntries]);

  const eventsByDay = (day: Date) => showSq7z ? events.filter((e) => isSameDay(new Date(e.start_time), day)) : [];
  const tswByDay = (day: Date) =>
    showTsw ? tswEntries.filter((t) => !initialTswLrpRows.some((r) => r.date === t.date) && isSameDay(parseISO(t.date), day)) : [];
  const drillByDay = (day: Date) =>
    showDrills ? mergedDrillsByDate.filter((r) => isSameDay(parseISO(r.date), day)) : [];

  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const upcomingEvents = showSq7z ? events.filter((e) => new Date(e.start_time) >= today) : [];
  const upcomingTsw = showTsw ? tswEntries.filter((t) => !initialTswLrpRows.some((r) => r.date === t.date) && parseISO(t.date) >= today) : [];
  const upcomingDrills = showDrills ? mergedDrillsByDate.filter((r) => parseISO(r.date) >= today) : [];

  type MergedDrill = (typeof mergedDrillsByDate)[number];

  // Merged + sorted list for list view
  type ListItem = { date: Date; key: string } & (
    | { kind: "event"; event: Event }
    | { kind: "tsw"; tsw: TswEntry }
    | { kind: "drill"; drill: MergedDrill }
  );
  const listItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [
      ...upcomingEvents.map((e) => ({ kind: "event" as const, event: e, date: new Date(e.start_time), key: `e-${e.id}` })),
      ...upcomingTsw.map((t) => ({ kind: "tsw" as const, tsw: t, date: parseISO(t.date), key: `t-${t.id}` })),
      ...upcomingDrills.map((r) => ({ kind: "drill" as const, drill: r, date: parseISO(r.date), key: `drill-${r.date}` })),
    ];
    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [upcomingEvents, upcomingTsw, upcomingDrills]);

  const openNew = () => { setEditingEvent(null); setDrawerOpen(true); };
  const openEdit = (e: Event) => { setEditingEvent(e); setDrawerOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#003087]">Training Schedule</h1>
          <LiveIndicator />
          <HintButton title="Training Schedule" hints={CALENDAR_HINTS} />
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

      {/* Filter toggles / Legend */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {[
          { key: "sq7z",   label: "SQ7Z Events", color: "bg-blue-100 border-blue-300 text-blue-700",     active: showSq7z,   toggle: () => setShowSq7z((v: boolean) => !v) },
          { key: "tsw",    label: "TSW Events",  color: "bg-orange-100 border-orange-300 text-orange-700", active: showTsw,    toggle: () => setShowTsw((v: boolean) => !v) },
          { key: "drills", label: "Drills",      color: "bg-blue-100 border-blue-400 text-blue-800",      active: showDrills, toggle: () => setShowDrills((v: boolean) => !v) },
        ].map(({ key, label, color, active, toggle }) => (
          <button
            key={key}
            onClick={toggle}
            className={cn("flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium transition-opacity", color, !active && "opacity-40")}
          >
            {label}
          </button>
        ))}
        {(!showSq7z || !showTsw || !showDrills) && (
          <button
            onClick={() => { setShowSq7z(true); setShowTsw(true); setShowDrills(true); }}
            className="rounded-full border border-gray-300 bg-white px-2.5 py-1 font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Reset filters
          </button>
        )}
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
              const dayDrills = drillByDay(day);
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
                        className={cn("block w-full rounded px-1 py-0.5 text-left text-[10px] leading-tight", EVENT_TYPE_COLORS[e.event_type])}
                      >
                        <span className="block truncate">{e.title}</span>
                        {e.location && <span className="block truncate opacity-70">{e.location}</span>}
                      </button>
                    ))}
                    {dayTsw.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTsw(t)}
                        className="block w-full truncate rounded bg-orange-100 px-1 py-0.5 text-left text-[10px] text-orange-800 hover:bg-orange-200"
                      >
                        {t.title}
                      </button>
                    ))}
                    {dayDrills.map((r) => {
                      const podStatus = podStatusByDate[r.date];
                      const absenceCount = absenceCountsByDate[r.date] ?? 0;
                      return (
                        <button
                          key={r.date}
                          onClick={() => setSelectedDrill({ ...r, kind: r.hasSq7z ? "sq7z" : "tsw" })}
                          className="block w-full rounded bg-blue-200 px-1 py-0.5 text-left text-[10px] text-blue-900 hover:bg-blue-300"
                        >
                          <div className="flex items-center gap-1">
                            <span className="truncate flex-1">{r.title}</span>
                            <div className="flex shrink-0 items-center gap-0.5">
                              {/* POD status dot */}
                              {r.hasSq7z && (
                                <span className={cn("h-1.5 w-1.5 rounded-full",
                                  podStatus === "approved" ? "bg-green-500" :
                                  podStatus === "submitted" ? "bg-blue-500" :
                                  podStatus === "draft" ? "bg-gray-400" : "bg-gray-200"
                                )} title={podStatus ?? "No POD"} />
                              )}
                              {/* Absence count badge */}
                              {absenceCount > 0 && (
                                <span className="rounded-full bg-red-500 px-1 text-[8px] font-bold text-white leading-tight">{absenceCount}</span>
                              )}
                              {/* Dual badge when both units */}
                              {r.hasSq7z && r.hasTsw && (
                                <span className="rounded-sm bg-orange-300 px-0.5 text-[7px] font-bold text-orange-900 leading-tight" title="Both SQ7Z and TSW drill this day">+T</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
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
                    {format(new Date(item.event.start_time), "EEE, MMM d 'at' HH:mm")}
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
            ) : item.kind === "tsw" ? (
              <Card
                key={item.key}
                className="flex cursor-pointer items-center justify-between p-4 border-l-4 border-l-orange-400 hover:bg-gray-50"
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
                <Badge variant="outline" className="shrink-0 border-orange-400 bg-orange-50 text-orange-700">
                  <Ship className="mr-1 h-3 w-3" /> TSW
                </Badge>
              </Card>
            ) : (
              <Card
                key={item.key}
                className="flex cursor-pointer items-center justify-between p-4 border-l-4 border-l-blue-400 hover:bg-gray-50"
                onClick={() => setSelectedDrill({ ...item.drill, kind: item.drill.hasSq7z ? "sq7z" : "tsw" })}
              >
                <div>
                  <p className="font-semibold">{item.drill.title}</p>
                  <p className="text-sm text-gray-500">
                    {format(parseISO(item.drill.date), "EEE, MMM d")}
                    {item.drill.theme && item.drill.title !== item.drill.theme ? ` · ${item.drill.theme}` : ""}
                  </p>
                  {item.drill.notes && <p className="mt-1 text-sm text-gray-600 line-clamp-1">{item.drill.notes}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  {item.drill.hasSq7z && <Badge variant="outline" className="border-blue-400 bg-blue-50 text-blue-700">SQ7Z</Badge>}
                  {item.drill.hasTsw && <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-600">TSW</Badge>}
                </div>
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
                  <Ship className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-orange-600">TSW Event</span>
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

      {selectedDrill && profile && (
        <DrillDetailModal
          entry={selectedDrill}
          onClose={() => setSelectedDrill(null)}
          profile={profile}
        />
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
