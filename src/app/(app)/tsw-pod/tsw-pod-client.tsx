"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Plus, Save, Pencil, X, CalendarDays, Clock, MapPin, ChevronLeft, ChevronRight, Trash2, CalendarPlus, Printer } from "lucide-react";
import { HintButton } from "@/components/shared/hint-button";
import { AbsenceRequestButton } from "@/components/absence-requests/absence-request-button";
import type { Profile } from "@/types/database";

const TSW_POD_HINTS = [
  { heading: "Navigating dates", body: "Use the arrows next to the date to move between meeting days. The calendar only shows days that have a TSW meeting session — add sessions using 'Manage Meeting Dates' below." },
  { heading: "Writing the TSW POD", body: "Click 'Edit' and fill in the schedule items, location, and notes for that meeting. Hit 'Save' when done." },
  { heading: "Managing meeting dates", body: "Scroll to the bottom and expand 'Manage Meeting Dates'. Enter a date and click 'Add' to create a new session. Click the trash icon to remove one." },
  { heading: "Who can edit", body: "Only staff (officers and SNCOs) can create or edit TSW POD entries. Cadets and NCOs can view only." },
];
import { Button } from "@/components/ui/button";

type LrpBlock = { id: string; topic: string; block_type: string };
type MeetingSession = { id: string; date: string };

type TswPodItem = {
  id: string;
  time: string;
  activity: string;
  location: string;
  notes: string;
};

type TswPod = {
  id: string;
  date: string;
  items: TswPodItem[];
  notes: string;
  uniform: string;
  leader: string;
  created_at: string;
  updated_at: string;
};

type ProfileSnippet = {
  id: string;
  full_name: string;
  rank: string | null;
  role: string;
};

function blankItem(): TswPodItem {
  return { id: crypto.randomUUID(), time: "", activity: "", location: "", notes: "" };
}

export function TswPodClient({
  initialPod,
  initialDate,
  initialEditing = false,
  canEdit,
  allProfiles,
  initialAllDates,
  lrpByDate = {},
  initialMeetingSessions = [],
  profile,
}: {
  initialPod: TswPod | null;
  initialDate: string;
  initialEditing?: boolean;
  canEdit: boolean;
  allProfiles: ProfileSnippet[];
  initialAllDates: string[];
  lrpByDate?: Record<string, LrpBlock[]>;
  initialMeetingSessions?: MeetingSession[];
  profile?: Profile;
}) {
  const [date, setDate] = useState(initialDate);
  const [pod, setPod] = useState<TswPod | null>(initialPod);
  const [editing, setEditing] = useState(initialEditing && !initialPod);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allDates, setAllDates] = useState<string[]>(initialAllDates);
  const [newDateInput, setNewDateInput] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [meetingSessions, setMeetingSessions] = useState<MeetingSession[]>(initialMeetingSessions);
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState("");
  const [addingSession, setAddingSession] = useState(false);

  // Edit state — if auto-entering create mode, start with a blank item
  const startBlank = initialEditing && !initialPod;
  const [items, setItems] = useState<TswPodItem[]>(startBlank ? [blankItem()] : (initialPod?.items ?? []));
  const [notes, setNotes] = useState(initialPod?.notes ?? "");
  const [uniform, setUniform] = useState(initialPod?.uniform ?? "");
  const [leader, setLeader] = useState(initialPod?.leader ?? "");

  const loadDate = useCallback(async (d: string) => {
    setLoading(true);
    setEditing(false);
    const supabase = createClient();
    const { data } = await supabase.from("tsw_plan_of_day" as never).select("*").eq("date", d).maybeSingle();
    const p = data as TswPod | null;
    setPod(p);
    setItems(p?.items ?? []);
    setNotes(p?.notes ?? "");
    setUniform(p?.uniform ?? "");
    setLeader(p?.leader ?? "");
    setLoading(false);
  }, []);

  const drillIdx = allDates.indexOf(date);
  const prevDate = drillIdx > 0 ? allDates[drillIdx - 1] : null;
  const nextDate = drillIdx >= 0 && drillIdx < allDates.length - 1 ? allDates[drillIdx + 1] : null;

  const goTo = (d: string) => { setDate(d); loadDate(d); };

  const addItem = () => setItems((prev) => [...prev, blankItem()]);

  const updateItem = (id: string, field: keyof TswPodItem, value: string) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i));

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const startEdit = () => {
    if (!pod) {
      setItems([blankItem()]);
      setNotes(""); setUniform(""); setLeader("");
    }
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    const cleanItems = items.filter((i) => i.activity.trim());
    const payload = { date, items: cleanItems, notes, uniform, leader, updated_at: new Date().toISOString() };

    let res;
    if (pod) {
      res = await supabase.from("tsw_plan_of_day" as never).update(payload as never).eq("id", pod.id).select().single();
    } else {
      res = await supabase.from("tsw_plan_of_day" as never).insert(payload as never).select().single();
    }

    if (res.error) { toast.error(res.error.message); }
    else {
      setPod(res.data as TswPod);
      setItems((res.data as TswPod).items ?? []);
      if (!pod) setAllDates((prev) => [...prev, date].sort());
      toast.success("TSW POD saved.");
      setEditing(false);
    }
    setSaving(false);
  };

  const addMeetingSession = async () => {
    if (!newSessionDate) return;
    if (meetingSessions.some((s) => s.date === newSessionDate)) {
      toast.info("That date is already a meeting session.");
      return;
    }
    setAddingSession(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("tsw_meeting_sessions")
      .insert({ date: newSessionDate })
      .select()
      .single();
    if (error) { toast.error(error.message); setAddingSession(false); return; }
    setMeetingSessions((prev) => [...prev, data as MeetingSession].sort((a, b) => a.date.localeCompare(b.date)));
    setNewSessionDate("");
    toast.success("Meeting date added.");
    setAddingSession(false);
  };

  const deleteMeetingSession = async (id: string) => {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("tsw_meeting_sessions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setMeetingSessions((prev) => prev.filter((s) => s.id !== id));
    toast.success("Meeting date removed.");
  };

  const displayDate = parseISO(date);

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">TSW Plan of Day</h1>
            <HintButton title="TSW Plan of Day" hints={TSW_POD_HINTS} />
          </div>
          <p className="text-sm text-gray-500">League Cadet meeting schedule</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Cadet: request leave directly from TSW POD */}
          {!canEdit && profile && (
            <AbsenceRequestButton profile={profile} buttonVariant="outline" drillSource="tsw" />
          )}
          {canEdit && pod && !editing && (
            <Button onClick={() => window.open(`/tsw-pod/${date}/print`, "_blank")} size="sm" variant="outline">
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          )}
          {canEdit && !editing && (
            <Button onClick={startEdit} size="sm" variant="outline">
              <Pencil className="h-4 w-4 mr-1" /> {pod ? "Edit" : "Create"}
            </Button>
          )}
          {editing && (
            <>
              <Button onClick={save} disabled={saving} size="sm">
                <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save"}
              </Button>
              <Button onClick={() => { setEditing(false); loadDate(date); }} variant="ghost" size="sm">Cancel</Button>
            </>
          )}
        </div>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-2 rounded-xl border bg-white p-3 shadow-sm">
        <button
          onClick={() => prevDate && goTo(prevDate)}
          disabled={!prevDate}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold text-gray-900">
            {format(displayDate, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <button
          onClick={() => nextDate && goTo(nextDate)}
          disabled={!nextDate}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {canEdit && (
          <button
            onClick={() => setShowDatePicker((v) => !v)}
            className="ml-2 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            New date
          </button>
        )}
      </div>

      {showDatePicker && canEdit && (
        <div className="flex gap-2 items-center rounded-xl border bg-white p-3 shadow-sm">
          <input
            type="date"
            value={newDateInput}
            onChange={(e) => setNewDateInput(e.target.value)}
            className="rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
          />
          <Button
            size="sm"
            disabled={!newDateInput}
            onClick={() => { setDate(newDateInput); loadDate(newDateInput); setShowDatePicker(false); setNewDateInput(""); }}
          >
            Go
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowDatePicker(false)}>Cancel</Button>
        </div>
      )}

      {loading && (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-400">Loading…</div>
      )}

      {!loading && !pod && !editing && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-400">
          <CalendarDays className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No POD for this date.</p>
          {canEdit && (
            <Button onClick={startEdit} size="sm" variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-1" /> Create POD
            </Button>
          )}
        </div>
      )}

      {!loading && (pod || editing) && (
        <div className="space-y-4">
          {/* Header fields */}
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Uniform</label>
                {editing ? (
                  <input
                    value={uniform}
                    onChange={(e) => setUniform(e.target.value)}
                    placeholder="e.g. NWU Type III"
                    className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
                  />
                ) : (
                  <p className="text-sm text-gray-800">{pod?.uniform || <span className="text-gray-400 italic">Not set</span>}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Meeting Leader</label>
                {editing ? (
                  <select
                    value={leader}
                    onChange={(e) => setLeader(e.target.value)}
                    className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
                  >
                    <option value="">—</option>
                    {allProfiles.map((p) => (
                      <option key={p.id} value={p.full_name}>{p.rank ? `${p.rank} ${p.full_name}` : p.full_name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-gray-800">{pod?.leader || <span className="text-gray-400 italic">Not set</span>}</p>
                )}
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="border-b px-5 py-4">
              <p className="text-sm font-bold text-gray-900">Meeting Schedule</p>
            </div>
            <div className="p-4 space-y-2">
              {/* LRP quick-add */}
              {editing && (lrpByDate[date] ?? []).length > 0 && (
                <div className="mb-3 rounded-lg border border-purple-200 bg-purple-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-700">From TSW Long Range Plan</p>
                  <div className="flex flex-wrap gap-2">
                    {(lrpByDate[date] ?? []).map((block) => {
                      const alreadyAdded = items.some((i) => i.activity === block.topic);
                      return (
                        <button
                          key={block.id}
                          disabled={alreadyAdded}
                          onClick={() => {
                            if (!alreadyAdded) setItems((prev) => [...prev, { ...blankItem(), activity: block.topic }]);
                          }}
                          className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium bg-purple-100 text-purple-700 border-purple-200 ${alreadyAdded ? "opacity-40 cursor-default" : "hover:bg-purple-200 cursor-pointer"}`}
                        >
                          {!alreadyAdded && <Plus className="h-3 w-3" />}
                          {block.topic}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {items.map((item) => (
                <div key={item.id} className="flex gap-2 items-start">
                  {editing ? (
                    <>
                      <input
                        value={item.time}
                        onChange={(e) => updateItem(item.id, "time", e.target.value)}
                        placeholder="Time"
                        className="w-20 rounded border bg-gray-50 px-2 py-1.5 text-sm focus:outline-none"
                      />
                      <input
                        value={item.activity}
                        onChange={(e) => updateItem(item.id, "activity", e.target.value)}
                        placeholder="Activity"
                        className="flex-1 rounded border bg-gray-50 px-2 py-1.5 text-sm focus:outline-none"
                      />
                      <input
                        value={item.location}
                        onChange={(e) => updateItem(item.id, "location", e.target.value)}
                        placeholder="Location"
                        className="w-32 rounded border bg-gray-50 px-2 py-1.5 text-sm focus:outline-none"
                      />
                      <button onClick={() => removeItem(item.id)} className="mt-1.5 text-gray-300 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex items-start gap-3 w-full py-1.5 border-b border-gray-50 last:border-0">
                      {item.time && (
                        <span className="flex items-center gap-1 text-xs text-gray-400 w-16 shrink-0">
                          <Clock className="h-3 w-3" />{item.time}
                        </span>
                      )}
                      <span className="text-sm text-gray-900 flex-1">{item.activity}</span>
                      {item.location && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin className="h-3 w-3" />{item.location}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {editing && (
                <button
                  onClick={addItem}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#003087]/30 py-3 text-sm font-medium text-[#003087]/60 transition-colors hover:bg-[#003087]/5 hover:text-[#003087]"
                >
                  <Plus className="h-4 w-4" /> Add Evolution
                </button>
              )}
              {!editing && items.length === 0 && (
                <p className="text-sm text-gray-400 italic py-2">No schedule items.</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <label className="text-xs font-semibold text-gray-600 block mb-2">Notes / Guidance</label>
            {editing ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Additional notes, safety brief, etc."
                className="w-full rounded-lg border bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30 resize-y"
              />
            ) : (
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{pod?.notes || <span className="text-gray-400 italic">No notes.</span>}</p>
            )}
          </div>
        </div>
      )}

      {/* Meeting Sessions Manager */}
      {canEdit && (
        <div className="rounded-xl border bg-white shadow-sm">
          <button
            onClick={() => setShowSessionManager((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <span className="flex items-center gap-2">
              <CalendarPlus className="h-4 w-4 text-[#003087]" />
              Manage Meeting Dates ({meetingSessions.length})
            </span>
            <span className="text-xs text-gray-400">{showSessionManager ? "▲" : "▼"}</span>
          </button>
          {showSessionManager && (
            <div className="border-t px-4 pb-4 space-y-3">
              <div className="mt-3 flex gap-2 items-center">
                <input
                  type="date"
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  className="rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
                />
                <Button size="sm" disabled={!newSessionDate || addingSession} onClick={addMeetingSession}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Date
                </Button>
              </div>
              {meetingSessions.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No meeting dates scheduled.</p>
              ) : (
                <div className="space-y-1.5">
                  {meetingSessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-800">
                        {format(parseISO(s.date), "EEE, MMM d, yyyy")}
                      </span>
                      <button
                        onClick={() => deleteMeetingSession(s.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
