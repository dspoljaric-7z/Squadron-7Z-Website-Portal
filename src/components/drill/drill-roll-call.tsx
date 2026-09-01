"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Lock, Unlock, UserPlus, MapPin, Shirt, FileText, Shield, Save, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { isSeniorStaff } from "@/lib/permissions";
import { DRILL_ATTENDANCE_COLORS } from "@/lib/constants";
import { initials } from "@/lib/format";
import type { Profile, DrillSession, DrillAttendance, DrillVisitor, DrillAttendanceStatus, VisitorStatus, PlanOfDay } from "@/types/database";

type CadetRow = { id: string; full_name: string; rank: string | null; billet: string | null; division_id: string | null; role: string };
type AttendanceMap = Map<string, DrillAttendanceStatus>;

type WatchBillEntry = {
  id: string;
  session_id: string;
  position: string;
  profile_id: string | null;
  notes: string | null;
  profiles: { id: string; full_name: string; rank: string | null } | null;
};

const WATCH_POSITIONS = [
  { key: "duty_officer", label: "Duty Officer (DO)" },
  { key: "maa", label: "Master-at-Arms (MAA)" },
  { key: "ood", label: "Officer of the Deck (OOD)" },
  { key: "petty_officer_of_watch", label: "Petty Officer of the Watch (POW)" },
];

const CAT_COLORS: Record<string, string> = {
  formation: "border-[#003087] bg-[#003087]/5 text-[#003087]",
  training: "border-blue-300 bg-blue-50 text-blue-700",
  meal: "border-green-300 bg-green-50 text-green-700",
  admin: "border-amber-300 bg-amber-50 text-amber-700",
  general: "border-gray-200 bg-gray-50 text-gray-600",
};

const STATUS_BUTTONS: { status: DrillAttendanceStatus; label: string; color: string }[] = [
  { status: "present",  label: "P", color: "bg-green-500 hover:bg-green-600 text-white" },
  { status: "absent",   label: "A", color: "bg-red-500 hover:bg-red-600 text-white" },
  { status: "excused",  label: "E", color: "bg-amber-500 hover:bg-amber-600 text-white" },
  { status: "late",     label: "L", color: "bg-orange-500 hover:bg-orange-600 text-white" },
];

export function DrillRollCall({
  session,
  cadets,
  initialAttendance,
  initialVisitors,
  profile,
  pod,
  initialWatchBill,
}: {
  session: DrillSession;
  cadets: CadetRow[];
  initialAttendance: DrillAttendance[];
  initialVisitors: DrillVisitor[];
  profile: Profile;
  pod?: PlanOfDay | null;
  initialWatchBill?: WatchBillEntry[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const canEdit = isSeniorStaff(profile) && !session.locked;

  const [attendance, setAttendance] = useState<AttendanceMap>(
    () => new Map(initialAttendance.map((a) => [a.cadet_id, a.status]))
  );
  const [visitors, setVisitors] = useState(initialVisitors);
  const [saving, setSaving] = useState<string | null>(null);
  const [locked, setLocked] = useState(session.locked);
  const [searchQ, setSearchQ] = useState("");
  const [newVisitor, setNewVisitor] = useState({ name: "", unit: "", guardian_contact: "", notes: "" });
  const [addingVisitor, setAddingVisitor] = useState(false);

  // Watch bill state
  const [watchBill, setWatchBill] = useState<WatchBillEntry[]>(initialWatchBill ?? []);
  const [watchBillEdits, setWatchBillEdits] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    (initialWatchBill ?? []).forEach((e) => { map[e.position] = e.profile_id ?? ""; });
    return map;
  });
  const [savingWatch, setSavingWatch] = useState(false);

  const filteredCadets = useMemo(() => {
    if (!searchQ) return cadets;
    const q = searchQ.toLowerCase();
    return cadets.filter((c) => c.full_name.toLowerCase().includes(q) || (c.rank ?? "").toLowerCase().includes(q));
  }, [cadets, searchQ]);

  const totals = useMemo(() => {
    const counts = { present: 0, absent: 0, excused: 0, late: 0 };
    attendance.forEach((s) => { counts[s] = (counts[s] ?? 0) + 1; });
    const total = cadets.length;
    const presentLate = counts.present + counts.late;
    const pct = total > 0 ? Math.round((presentLate / total) * 100) : 0;
    return { ...counts, total, pct };
  }, [attendance, cadets.length]);

  const markAttendance = async (cadetId: string, status: DrillAttendanceStatus) => {
    if (!canEdit) return;
    const prev = attendance.get(cadetId);
    if (prev === status) return;

    setAttendance((m) => new Map(m).set(cadetId, status));
    setSaving(cadetId);

    const { error } = await supabase.from("drill_attendance").upsert({
      session_id: session.id,
      cadet_id: cadetId,
      status,
      recorded_by: profile.id,
      recorded_at: new Date().toISOString(),
    }, { onConflict: "session_id,cadet_id" });

    setSaving(null);
    if (error) {
      setAttendance((m) => { const n = new Map(m); if (prev) n.set(cadetId, prev); else n.delete(cadetId); return n; });
      toast.error("Failed to save");
    }
  };

  const toggleLock = async () => {
    const newLocked = !locked;
    const { error } = await supabase.from("drill_sessions").update({ locked: newLocked }).eq("id", session.id);
    if (error) { toast.error("Failed to update lock"); return; }
    setLocked(newLocked);
    toast.success(newLocked ? "Session locked" : "Session unlocked");
  };

  const addVisitor = async () => {
    if (!newVisitor.name.trim()) return;
    setAddingVisitor(true);
    const { data, error } = await supabase
      .from("drill_visitors")
      .insert({ session_id: session.id, ...newVisitor })
      .select()
      .single();
    setAddingVisitor(false);
    if (error) { toast.error("Failed to add visitor"); return; }
    setVisitors((v) => [...v, data]);
    setNewVisitor({ name: "", unit: "", guardian_contact: "", notes: "" });
    toast.success("Visitor added");
  };

  const updateVisitorStatus = async (visitorId: string, status: VisitorStatus) => {
    await supabase.from("drill_visitors").update({ status }).eq("id", visitorId);
    setVisitors((v) => v.map((vis) => vis.id === visitorId ? { ...vis, status } : vis));
  };

  const saveWatchBill = async () => {
    setSavingWatch(true);
    const upserts = WATCH_POSITIONS.map((p) => ({
      session_id: session.id,
      position: p.key,
      profile_id: watchBillEdits[p.key] || null,
    }));
    const { error } = await supabase
      .from("watch_bills")
      .upsert(upserts, { onConflict: "session_id,position" });
    setSavingWatch(false);
    if (error) { toast.error("Failed to save watch bill"); return; }

    // Refresh local state with assigned names
    const profileIds = upserts.map((u) => u.profile_id).filter(Boolean) as string[];
    const { data: profiles } = profileIds.length
      ? await supabase.from("profiles").select("id, full_name, rank").in("id", profileIds)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    setWatchBill(upserts.map((u) => ({
      id: u.position,
      session_id: u.session_id,
      position: u.position,
      profile_id: u.profile_id,
      notes: null,
      profiles: u.profile_id ? (profileMap.get(u.profile_id) ?? null) : null,
    })));
    toast.success("Watch bill saved");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <button onClick={() => router.push("/drill")} className="mb-1 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> All Sessions
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {format(new Date(session.date + "T12:00:00"), "EEEE, MMMM d, yyyy")}
          </h1>
          <div className="mt-1 flex flex-wrap gap-2 text-sm text-gray-500">
            {session.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{session.location}</span>}
            {session.uniform_of_day && <span className="flex items-center gap-1"><Shirt className="h-3.5 w-3.5" />{session.uniform_of_day}</span>}
          </div>
        </div>
        {isSeniorStaff(profile) && (
          <Button variant="outline" size="sm" onClick={toggleLock} className="shrink-0">
            {locked ? <><Unlock className="mr-1.5 h-4 w-4" />Unlock</> : <><Lock className="mr-1.5 h-4 w-4" />Lock</>}
          </Button>
        )}
      </div>

      {/* Totals bar */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "Present", val: totals.present, color: "text-green-700 bg-green-50 border-green-200" },
          { label: "Late",    val: totals.late,    color: "text-orange-700 bg-orange-50 border-orange-200" },
          { label: "Excused", val: totals.excused, color: "text-amber-700 bg-amber-50 border-amber-200" },
          { label: "Absent",  val: totals.absent,  color: "text-red-700 bg-red-50 border-red-200" },
          { label: "Rate",    val: `${totals.pct}%`, color: "text-[#003087] bg-blue-50 border-blue-200" },
        ].map(({ label, val, color }) => (
          <div key={label} className={`rounded-lg border p-2 text-center ${color}`}>
            <div className="text-lg font-bold leading-none">{val}</div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide">{label}</div>
          </div>
        ))}
      </div>

      {/* Unaccounted panel */}
      {(() => {
        const unaccounted = cadets.filter((c) => !attendance.has(c.id));
        if (unaccounted.length === 0) return null;
        return (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1.5">
                {unaccounted.length}
              </span>
              <p className="text-sm font-semibold text-red-800">Unaccounted — mark P/A/E/L to clear</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {unaccounted.map((c) => (
                <span key={c.id} className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  {c.rank ? `${c.rank} ` : ""}{c.full_name}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      <Tabs defaultValue="roll-call">
        <TabsList>
          <TabsTrigger value="roll-call">Roll Call ({cadets.length})</TabsTrigger>
          <TabsTrigger value="visitors">Visitors ({visitors.length})</TabsTrigger>
          <TabsTrigger value="watch-bill"><Shield className="mr-1.5 h-3.5 w-3.5" />Watch Bill</TabsTrigger>
          {pod && <TabsTrigger value="pod"><FileText className="mr-1.5 h-3.5 w-3.5" />Plan of Day</TabsTrigger>}
        </TabsList>

        <TabsContent value="roll-call" className="mt-3 space-y-2">
          <Input
            placeholder="Search cadets…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="h-10"
          />

          {!canEdit && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {locked ? "This session is locked." : "Only officers and SNCOs can edit attendance."}
            </div>
          )}

          <div className="space-y-1">
            {filteredCadets.map((cadet) => {
              const status = attendance.get(cadet.id) ?? "absent";
              const isSaving = saving === cadet.id;
              return (
                <div
                  key={cadet.id}
                  className="flex items-center gap-2 rounded-lg border bg-white p-2.5"
                >
                  {/* Avatar */}
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${DRILL_ATTENDANCE_COLORS[status]}`}>
                    {isSaving ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      initials(cadet.full_name)
                    )}
                  </div>

                  {/* Name */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight text-gray-900">
                      {cadet.rank ? `${cadet.rank} ` : ""}{cadet.full_name}
                    </p>
                    {cadet.billet && <p className="truncate text-[11px] text-gray-400">{cadet.billet}</p>}
                  </div>

                  {/* Status buttons */}
                  {canEdit && (
                    <div className="flex shrink-0 gap-1">
                      {STATUS_BUTTONS.map(({ status: s, label, color }) => (
                        <button
                          key={s}
                          onClick={() => markAttendance(cadet.id, s)}
                          className={`h-9 w-9 rounded-lg text-sm font-bold transition-all ${
                            status === s ? color : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Read-only badge */}
                  {!canEdit && (
                    <Badge className={DRILL_ATTENDANCE_COLORS[status]} variant="outline">
                      {status}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="visitors" className="mt-3 space-y-3">
          {canEdit && (
            <Card className="p-4">
              <h3 className="mb-3 font-semibold text-gray-900">Add Visitor / Prospect</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input value={newVisitor.name} onChange={(e) => setNewVisitor({ ...newVisitor, name: e.target.value })} placeholder="Full name" />
                </div>
                <div className="space-y-1">
                  <Label>Unit / School</Label>
                  <Input value={newVisitor.unit} onChange={(e) => setNewVisitor({ ...newVisitor, unit: e.target.value })} placeholder="Optional" />
                </div>
                <div className="space-y-1">
                  <Label>Guardian Contact</Label>
                  <Input value={newVisitor.guardian_contact} onChange={(e) => setNewVisitor({ ...newVisitor, guardian_contact: e.target.value })} placeholder="Phone or email" />
                </div>
                <div className="space-y-1">
                  <Label>Notes</Label>
                  <Input value={newVisitor.notes} onChange={(e) => setNewVisitor({ ...newVisitor, notes: e.target.value })} placeholder="Any notes" />
                </div>
              </div>
              <Button onClick={addVisitor} disabled={addingVisitor || !newVisitor.name.trim()} className="mt-3 bg-[#003087] hover:bg-[#002266]" size="sm">
                <UserPlus className="mr-1.5 h-4 w-4" /> Add Visitor
              </Button>
            </Card>
          )}

          <div className="space-y-2">
            {visitors.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-400">
                No visitors recorded for this session.
              </div>
            )}
            {visitors.map((v) => (
              <Card key={v.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{v.name}</p>
                    {v.unit && <p className="text-sm text-gray-500">{v.unit}</p>}
                    {v.guardian_contact && <p className="text-sm text-gray-400">Contact: {v.guardian_contact}</p>}
                    {v.notes && <p className="mt-1 text-sm text-gray-400 italic">{v.notes}</p>}
                  </div>
                  {canEdit && (
                    <Select value={v.status} onValueChange={(val) => updateVisitorStatus(v.id, val as VisitorStatus)}>
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="enrolled">Enrolled</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="not_interested">Not Interested</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Watch Bill Tab */}
        <TabsContent value="watch-bill" className="mt-3 space-y-3">
          <div className="rounded-lg border bg-white divide-y">
            {WATCH_POSITIONS.map((pos) => {
              const entry = watchBill.find((e) => e.position === pos.key);
              const assignedProfile = entry?.profiles;
              return (
                <div key={pos.key} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{pos.label}</p>
                    {!canEdit && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {assignedProfile
                          ? `${assignedProfile.rank ? assignedProfile.rank + " " : ""}${assignedProfile.full_name}`
                          : <span className="text-gray-400 italic">Unassigned</span>}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <Select
                      value={watchBillEdits[pos.key] ?? ""}
                      onValueChange={(v) => setWatchBillEdits((prev) => ({ ...prev, [pos.key]: v ?? "" }))}
                    >
                      <SelectTrigger className="w-56 h-9 text-sm">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— Unassigned —</SelectItem>
                        {cadets
                          .filter((c) => c.role === "officer" || c.role === "snco" || c.role === "nco")
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.rank ? `${c.rank} ` : ""}{c.full_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              );
            })}
          </div>
          {canEdit && (
            <Button onClick={saveWatchBill} disabled={savingWatch} size="sm" className="bg-[#003087] hover:bg-[#002266]">
              <Save className="mr-1.5 h-4 w-4" />
              {savingWatch ? "Saving…" : "Save Watch Bill"}
            </Button>
          )}
        </TabsContent>

        {/* Plan of Day Tab */}
        {pod && (
          <TabsContent value="pod" className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-3 text-sm">
              {pod.uniform_of_day && (
                <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                  <Shirt className="h-3.5 w-3.5" /> {pod.uniform_of_day}
                </span>
              )}
              {pod.watch_bill && (
                <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                  <Shield className="h-3.5 w-3.5" /> {pod.watch_bill}
                </span>
              )}
            </div>

            {pod.items && pod.items.length > 0 ? (
              <div className="rounded-lg border bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-2 w-16">Time</th>
                      <th className="px-3 py-2">Activity</th>
                      <th className="px-3 py-2 hidden sm:table-cell">Location</th>
                      <th className="px-3 py-2 hidden sm:table-cell">Lead</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pod.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2.5 font-mono text-xs text-gray-500 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />{item.time}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${CAT_COLORS[item.category] ?? CAT_COLORS.general}`}>
                            {item.activity}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-500 hidden sm:table-cell">{item.location}</td>
                        <td className="px-3 py-2.5 text-gray-500 hidden sm:table-cell">{item.responsible_name ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-400">
                No items on this plan of day.
              </div>
            )}

            {pod.notes && (
              <Card className="p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{pod.notes}</p>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
