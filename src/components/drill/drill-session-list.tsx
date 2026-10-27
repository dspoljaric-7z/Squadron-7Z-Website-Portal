"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronRight, ChevronDown, ClipboardCheck, Lock, CalendarDays, Archive } from "lucide-react";
import { createRecurringDrillSessions } from "@/app/(app)/settings/actions";
import { format } from "date-fns";
import { HintButton } from "@/components/shared/hint-button";

const DRILL_HINTS = [
  { heading: "Starting a drill session", body: "Click 'New Session' and pick the date, then hit Create. The session opens automatically." },
  { heading: "Taking muster", body: "Open a session and tap each cadet's name to cycle through Present → Absent → Excused. Use the quick-fill buttons at the top to mark everyone at once, then adjust exceptions." },
  { heading: "Locking a session", body: "Once attendance is finalized, click 'Lock Session' to prevent changes. Locked sessions still appear on cadet records." },
  { heading: "Recurring sessions", body: "Use 'Create Recurring' to bulk-generate sessions for the rest of the semester — pick a day of week, start/end dates, and the portal creates them all at once." },
  { heading: "Approved absences", body: "When an absence request is approved on the Absence Requests page, the portal automatically marks that cadet Excused in the matching drill session." },
];
import { toast } from "sonner";
import { isSeniorStaff } from "@/lib/permissions";
import type { Profile, DrillSession } from "@/types/database";

type SessionWithNames = DrillSession & {
  maa: { full_name: string } | null;
  recorder: { full_name: string } | null;
};

type LrpRow = { id: string; week_start: string; theme: string; status: string };

export function DrillSessionList({
  initialSessions,
  officers,
  profile,
  lrpRows = [],
}: {
  initialSessions: SessionWithNames[];
  officers: { id: string; full_name: string; rank: string | null }[];
  profile: Profile;
  lrpRows?: LrpRow[];
}) {
  const router = useRouter();
  const sessions = initialSessions;
  const [showArchived, setShowArchived] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    location: "",
    uniform_of_day: "",
    maa_id: "",
  });
  const [showRecurring, setShowRecurring] = useState(false);
  const [creatingRecurring, setCreatingRecurring] = useState(false);
  const [recurringForm, setRecurringForm] = useState({
    startDate: new Date().toISOString().split("T")[0],
    frequencyDays: "7",
    count: "10",
    location: "",
    uniformOfDay: "",
    maaId: "",
  });

  const canCreate = isSeniorStaff(profile);

  const createRecurring = async () => {
    setCreatingRecurring(true);
    const res = await createRecurringDrillSessions(
      recurringForm.startDate,
      parseInt(recurringForm.frequencyDays),
      parseInt(recurringForm.count),
      recurringForm.location,
      recurringForm.uniformOfDay,
      recurringForm.maaId,
    );
    setCreatingRecurring(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success(`Created ${res.created} drill sessions`);
    setShowRecurring(false);
    router.refresh();
  };

  const createSession = async () => {
    if (!form.date) return;
    setCreating(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("drill_sessions")
      .insert({
        date: form.date,
        location: form.location || null,
        uniform_of_day: form.uniform_of_day || null,
        maa_id: form.maa_id || null,
        recorded_by: profile.id,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message.includes("unique") ? "A session already exists for that date." : error.message);
      setCreating(false);
      return;
    }

    toast.success("Drill session created");
    router.push(`/drill/${data.id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Drill Muster</h1>
            <HintButton title="Drill Muster" hints={DRILL_HINTS} />
          </div>
          <p className="text-sm text-gray-500">{sessions.length} session{sessions.length !== 1 ? "s" : ""} on record</p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <Button
              onClick={() => { setShowRecurring(!showRecurring); setShowNew(false); }}
              variant="outline"
              size="sm"
            >
              <CalendarDays className="mr-1.5 h-4 w-4" /> Recurring
            </Button>
            <Button
              onClick={() => { setShowNew(!showNew); setShowRecurring(false); }}
              className="bg-[#003087] hover:bg-[#002266]"
              size="sm"
            >
              <Plus className="mr-1.5 h-4 w-4" /> New Session
            </Button>
          </div>
        )}
      </div>

      {showNew && (
        <Card className="p-4">
          <h2 className="mb-4 font-semibold text-gray-900">New Drill Session</h2>

          {lrpRows.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">From Long-Range Plan</p>
              <div className="flex flex-wrap gap-2">
                {lrpRows.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setForm((f) => ({ ...f, date: r.week_start }))}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      form.date === r.week_start
                        ? "bg-[#003087] text-white border-[#003087]"
                        : "border-gray-200 text-gray-600 hover:border-[#003087] hover:text-[#003087]"
                    }`}
                  >
                    {format(new Date(r.week_start + "T12:00:00"), "MMM d")}
                    {r.theme ? ` — ${r.theme}` : ""}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input placeholder="e.g. Armory, Building 7" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Uniform of the Day</Label>
              <Input placeholder="e.g. Navy Blue Working Uniform" value={form.uniform_of_day} onChange={(e) => setForm({ ...form, uniform_of_day: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>MAA / Watch-Stander</Label>
              <Select value={form.maa_id} onValueChange={(v) => setForm({ ...form, maa_id: v ?? "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select officer…">
                    {form.maa_id ? (() => { const o = officers.find((x) => x.id === form.maa_id); return o ? `${o.full_name}${o.rank ? ` — ${o.rank}` : ""}` : null; })() : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {officers.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.full_name}{o.rank ? ` — ${o.rank}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={createSession} disabled={creating || !form.date} className="bg-[#003087] hover:bg-[#002266]">
              {creating ? "Creating…" : "Create & Open Muster"}
            </Button>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {showRecurring && (
        <Card className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#003087]" />
            <h2 className="font-semibold text-gray-900">Recurring Drill Schedule Generator</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Start Date *</Label>
              <Input type="date" value={recurringForm.startDate} onChange={(e) => setRecurringForm({ ...recurringForm, startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Frequency (days) *</Label>
              <Select value={recurringForm.frequencyDays} onValueChange={(v) => setRecurringForm({ ...recurringForm, frequencyDays: v ?? "7" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Weekly (every 7 days)</SelectItem>
                  <SelectItem value="14">Bi-weekly (every 14 days)</SelectItem>
                  <SelectItem value="28">Monthly (every 28 days)</SelectItem>
                  <SelectItem value="1">Daily (consecutive)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Number of Sessions *</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={recurringForm.count}
                onChange={(e) => setRecurringForm({ ...recurringForm, count: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input placeholder="e.g. Armory" value={recurringForm.location} onChange={(e) => setRecurringForm({ ...recurringForm, location: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Uniform of the Day</Label>
              <Input placeholder="e.g. NWU Type III" value={recurringForm.uniformOfDay} onChange={(e) => setRecurringForm({ ...recurringForm, uniformOfDay: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Default MAA</Label>
              <Select value={recurringForm.maaId} onValueChange={(v) => setRecurringForm({ ...recurringForm, maaId: v ?? "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select officer…">
                    {recurringForm.maaId ? (() => { const o = officers.find((x) => x.id === recurringForm.maaId); return o ? o.full_name : null; })() : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {officers.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.full_name}{o.rank ? ` — ${o.rank}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button
              onClick={createRecurring}
              disabled={creatingRecurring || !recurringForm.startDate || !recurringForm.count}
              className="bg-[#003087] hover:bg-[#002266]"
            >
              {creatingRecurring ? "Creating…" : `Create ${recurringForm.count} Sessions`}
            </Button>
            <Button variant="outline" onClick={() => setShowRecurring(false)}>Cancel</Button>
            <p className="ml-2 text-xs text-gray-400">
              Sessions will be created from {recurringForm.startDate} every {recurringForm.frequencyDays} day(s)
            </p>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {sessions.length === 0 && (
          <Card className="p-8 text-center">
            <ClipboardCheck className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-gray-500">No drill sessions yet.</p>
            {canCreate && <p className="mt-1 text-sm text-gray-400">Create the first one above.</p>}
          </Card>
        )}

        {(() => {
          const today = new Date().toISOString().split("T")[0];
          const isArchived = (s: SessionWithNames) => (s as unknown as { archived?: boolean }).archived === true;
          const active = sessions.filter((s) => !isArchived(s));
          const archivedSessions = sessions.filter((s) => isArchived(s));
          const upcoming = active.filter((s) => s.date >= today);
          const past = active.filter((s) => s.date < today);

          const SessionCard = ({ s, dim }: { s: SessionWithNames; dim?: boolean }) => (
            <button key={s.id} onClick={() => router.push(`/drill/${s.id}`)} className="w-full text-left">
              <Card className={`flex items-center justify-between p-4 transition-colors hover:bg-gray-50 ${dim ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${dim ? "bg-gray-100" : s.date >= today ? "bg-[#003087]/10" : "bg-gray-100"}`}>
                    {dim ? (
                      <Archive className="h-5 w-5 text-gray-400" />
                    ) : s.locked ? (
                      <Lock className={`h-5 w-5 ${s.date >= today ? "text-[#003087]" : "text-gray-400"}`} />
                    ) : (
                      <ClipboardCheck className={`h-5 w-5 ${s.date >= today ? "text-[#003087]" : "text-gray-400"}`} />
                    )}
                  </div>
                  <div>
                    <p className={`font-semibold ${dim ? "text-gray-400" : s.date >= today ? "text-gray-900" : "text-gray-700"}`}>
                      {format(new Date(s.date + "T12:00:00"), "EEEE, MMMM d, yyyy")}
                    </p>
                    <p className="text-sm text-gray-500">
                      {s.location ?? "Location TBD"}
                      {s.maa?.full_name ? ` · MAA: ${s.maa.full_name}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.locked && !dim && <Badge variant="outline" className="text-xs">Locked</Badge>}
                  {dim && <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Archived</Badge>}
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </Card>
            </button>
          );

          return (
            <>
              {upcoming.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Upcoming</p>
                  {upcoming.map((s) => <SessionCard key={s.id} s={s} />)}
                </div>
              )}
              {past.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Recent Past {past.length >= 10 ? "(last 10)" : ""}
                  </p>
                  {past.map((s) => <SessionCard key={s.id} s={s} />)}
                </div>
              )}
              {archivedSessions.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowArchived((v) => !v)}
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showArchived ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    <Archive className="h-3.5 w-3.5" />
                    Archived ({archivedSessions.length})
                  </button>
                  {showArchived && archivedSessions.map((s) => <SessionCard key={s.id} s={s} dim />)}
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
