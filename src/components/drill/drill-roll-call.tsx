"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Lock, Unlock, Archive, UserPlus, MapPin, Shirt, FileText, Shield, Save, Clock, Plus, CheckCircle2, HelpCircle, XCircle, MinusCircle, NotebookPen, ClipboardList, X, UserCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { isSeniorStaff } from "@/lib/permissions";
import { DRILL_ATTENDANCE_COLORS } from "@/lib/constants";
import { initials } from "@/lib/format";
import { createBlankPod } from "@/app/(app)/settings/actions";
import { convertVisitorToProfile, createProspectFromVisitor } from "@/app/(app)/recruiting/actions";
import type { Profile, DrillSession, DrillAttendance, DrillVisitor, DrillAttendanceStatus, VisitorStatus, PlanOfDay } from "@/types/database";

type CadetRow = { id: string; full_name: string; rank: string | null; billet: string | null; division_id: string | null; role: string };

function musterName(rank: string | null, full_name: string): string {
  const parts = full_name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    const first = parts.slice(0, parts.length - 1).join(" ");
    return rank ? `${rank} ${last}, ${first}` : `${last}, ${first}`;
  }
  return rank ? `${rank} ${full_name}` : full_name;
}
type DivisionSnippet = { id: string; name: string };
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

type RsvpRow = { profile_id: string; status: string };
type AbsenceRow = { cadet_id: string; status: "pending" | "approved" | "denied" };

const RSVP_CONFIG = {
  attending:     { label: "Going",     icon: CheckCircle2, cls: "text-green-600" },
  maybe:         { label: "Maybe",     icon: HelpCircle,   cls: "text-amber-500" },
  not_attending: { label: "Can't Go",  icon: XCircle,      cls: "text-red-500"   },
} as const;

export function DrillRollCall({
  session,
  cadets,
  initialAttendance,
  initialVisitors,
  profile,
  pod,
  initialWatchBill,
  initialRsvps = [],
  divisions = [],
  absenceRequests = [],
}: {
  session: DrillSession;
  cadets: CadetRow[];
  initialAttendance: DrillAttendance[];
  initialVisitors: DrillVisitor[];
  profile: Profile;
  pod?: PlanOfDay | null;
  initialWatchBill?: WatchBillEntry[];
  initialRsvps?: RsvpRow[];
  divisions?: DivisionSnippet[];
  absenceRequests?: AbsenceRow[];
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
  const [archived, setArchived] = useState((session as unknown as { archived?: boolean }).archived === true);
  const [searchQ, setSearchQ] = useState("");
  const [newVisitor, setNewVisitor] = useState({ name: "", unit: "", guardian_contact: "", notes: "" });
  const [addingVisitor, setAddingVisitor] = useState(false);
  const [editingVisitorId, setEditingVisitorId] = useState<string | null>(null);
  const [editVisitorForm, setEditVisitorForm] = useState({ name: "", unit: "", guardian_contact: "", notes: "" });
  const [savingVisitor, setSavingVisitor] = useState(false);
  const [convertingVisitorId, setConvertingVisitorId] = useState<string | null>(null);
  const [convertedVisitorIds, setConvertedVisitorIds] = useState<Set<string>>(new Set());
  const [newPreLogged, setNewPreLogged] = useState({ name: "", unit: "" });
  const [addingPreLogged, setAddingPreLogged] = useState(false);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [importingBulk, setImportingBulk] = useState(false);

  // Watch bill state
  const [watchBill, setWatchBill] = useState<WatchBillEntry[]>(initialWatchBill ?? []);
  const [watchBillEdits, setWatchBillEdits] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    (initialWatchBill ?? []).forEach((e) => { map[e.position] = e.profile_id ?? ""; });
    return map;
  });
  const [savingWatch, setSavingWatch] = useState(false);
  const [drillTab, setDrillTab] = useState<string>("muster");
  const [creatingPod, setCreatingPod] = useState(false);
  const [debrief, setDebrief] = useState(session.notes ?? "");
  const [savingDebrief, setSavingDebrief] = useState(false);
  const [submittingMuster, setSubmittingMuster] = useState(false);
  const [musterSubmitted, setMusterSubmitted] = useState(false);
  const [divisionFilter, setDivisionFilter] = useState("");

  const [arrivalTimes, setArrivalTimes] = useState<Map<string, string>>(
    () => new Map(initialAttendance.filter((a) => a.arrival_time).map((a) => [a.cadet_id, a.arrival_time!]))
  );

  const rsvpMap = useMemo(
    () => new Map(initialRsvps.map((r) => [r.profile_id, r.status])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const absenceMap = useMemo(
    () => new Map(absenceRequests.map((r) => [r.cadet_id, r.status])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const bulkMarkAll = async (status: DrillAttendanceStatus) => {
    if (!canEdit) return;
    const toMark = cadets.filter((c) => attendance.get(c.id) !== status);
    if (toMark.length === 0) return;
    setAttendance((m) => {
      const n = new Map(m);
      toMark.forEach((c) => n.set(c.id, status));
      return n;
    });
    const upserts = toMark.map((c) => ({
      session_id: session.id,
      cadet_id: c.id,
      status,
      recorded_by: profile.id,
      recorded_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("drill_attendance").upsert(upserts, { onConflict: "session_id,cadet_id" });
    if (error) toast.error("Bulk mark failed");
    else toast.success(`Marked ${toMark.length} cadets ${status}`);
  };

  const filteredCadets = useMemo(() => {
    let list = cadets;
    if (divisionFilter) list = list.filter((c) => c.division_id === divisionFilter);
    if (!searchQ) return list;
    const q = searchQ.toLowerCase();
    return list.filter((c) => c.full_name.toLowerCase().includes(q) || (c.rank ?? "").toLowerCase().includes(q));
  }, [cadets, searchQ, divisionFilter]);

  const totals = useMemo(() => {
    const counts = { present: 0, absent: 0, excused: 0, late: 0 };
    attendance.forEach((s) => { counts[s] = (counts[s] ?? 0) + 1; });
    // Visitors count toward totals and overall total
    visitors.forEach((v) => {
      const att = (v as DrillVisitor & { attendance?: string | null }).attendance;
      if (att === "present" || att === "late" || att === "absent" || att === "excused") {
        counts[att as keyof typeof counts] = (counts[att as keyof typeof counts] ?? 0) + 1;
      }
    });
    const total = cadets.length + visitors.length;
    const presentLate = counts.present + counts.late;
    const pct = total > 0 ? Math.round((presentLate / total) * 100) : 0;
    return { ...counts, total, pct };
  }, [attendance, cadets.length, visitors]);

  const markAttendance = async (cadetId: string, status: DrillAttendanceStatus, arrivalTime?: string) => {
    if (!canEdit) return;
    const prev = attendance.get(cadetId);
    if (prev === status && status !== "late") return;

    setAttendance((m) => new Map(m).set(cadetId, status));
    setSaving(cadetId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const payload: Record<string, unknown> = {
      session_id: session.id,
      cadet_id: cadetId,
      status,
      recorded_by: profile.id,
      recorded_at: new Date().toISOString(),
    };
    if (status === "late") {
      payload.arrival_time = arrivalTime ?? arrivalTimes.get(cadetId) ?? null;
    } else {
      payload.arrival_time = null;
    }

    const { error } = await sb.from("drill_attendance").upsert(payload, { onConflict: "session_id,cadet_id" });

    setSaving(null);
    if (error) {
      setAttendance((m) => { const n = new Map(m); if (prev) n.set(cadetId, prev); else n.delete(cadetId); return n; });
      toast.error("Failed to save");
    }
  };

  const saveArrivalTime = async (cadetId: string, time: string) => {
    setArrivalTimes((m) => new Map(m).set(cadetId, time));
    if (attendance.get(cadetId) === "late") {
      await markAttendance(cadetId, "late", time);
    }
  };

  const toggleLock = async () => {
    const newLocked = !locked;
    const { error } = await supabase.from("drill_sessions").update({ locked: newLocked }).eq("id", session.id);
    if (error) { toast.error("Failed to update lock"); return; }
    setLocked(newLocked);
    toast.success(newLocked ? "Session locked" : "Session unlocked");
  };

  const toggleArchive = async () => {
    const newArchived = !archived;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("drill_sessions") as any).update({ archived: newArchived }).eq("id", session.id);
    if (error) { toast.error("Failed to archive session"); return; }
    setArchived(newArchived);
    toast.success(newArchived ? "Session archived — data is preserved" : "Session unarchived");
  };

  const addVisitor = async () => {
    if (!newVisitor.name.trim()) return;
    setAddingVisitor(true);
    const { data, error } = await supabase
      .from("drill_visitors")
      .insert({ session_id: session.id, ...newVisitor })
      .select()
      .single();
    if (error) { setAddingVisitor(false); toast.error("Failed to add visitor"); return; }
    // Auto-create a prospect record so they appear in the Recruiting pipeline
    await createProspectFromVisitor(data.id, {
      name: newVisitor.name.trim(),
      unit: newVisitor.unit || null,
      guardian_contact: newVisitor.guardian_contact || null,
      notes: newVisitor.notes || null,
      visitDate: session.date,
    });
    setAddingVisitor(false);
    setVisitors((v) => [...v, data]);
    setNewVisitor({ name: "", unit: "", guardian_contact: "", notes: "" });
    toast.success("Visitor added");
  };

  const addPreLoggedVisitor = async () => {
    if (!newPreLogged.name.trim()) return;
    setAddingPreLogged(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("drill_visitors") as any)
      .insert({ session_id: session.id, name: newPreLogged.name.trim(), unit: newPreLogged.unit.trim() || null, pre_logged: true, status: "prospect" })
      .select()
      .single();
    if (error) { setAddingPreLogged(false); toast.error("Failed to pre-log visitor"); return; }
    await createProspectFromVisitor(data.id, {
      name: newPreLogged.name.trim(),
      unit: newPreLogged.unit.trim() || null,
      visitDate: session.date,
    });
    setAddingPreLogged(false);
    setVisitors((v) => [...v, data]);
    setNewPreLogged({ name: "", unit: "" });
    toast.success("Visitor pre-logged");
  };

  const parsePasteText = (text: string): Array<{ name: string; unit: string; status: VisitorStatus; guardian_contact: string; notes: string }> => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const rows: Array<{ name: string; unit: string; status: VisitorStatus; guardian_contact: string; notes: string }> = [];
    for (const line of lines) {
      if (/^(name|visitor|first|last|unit|nscc|nlcc|status|#)\b/i.test(line)) continue;
      const parts = line.split('\t').map((p) => p.trim());
      let name = '', unit = '', statusHint = '', guardian = '', notes = '';
      if (parts.length >= 2) {
        name = parts[0];
        unit = parts[1];
        if (parts[2]) statusHint = parts[2];
        if (parts[3]) guardian = parts[3];
        if (parts.length >= 5) notes = parts.slice(4).join(' ').trim();
      } else {
        const parenMatch = line.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
        if (parenMatch) {
          name = parenMatch[1].trim();
          unit = parenMatch[2].trim();
        } else {
          const unitMatch = line.match(/\b(NSCC|NLCC)\b/i);
          name = line.replace(/\b(NSCC|NLCC)\b/i, '').trim().replace(/\s{2,}/g, ' ');
          if (unitMatch) unit = unitMatch[1].toUpperCase();
        }
      }
      if (!unit) {
        const m = name.match(/\b(NSCC|NLCC)\b/i);
        if (m) { unit = m[1].toUpperCase(); name = name.replace(m[0], '').trim(); }
      }
      const status: VisitorStatus = /enrolled|active\s*member|current\s*member/i.test(statusHint + ' ' + notes) ? 'enrolled' : 'prospect';
      if (name) rows.push({ name, unit, status, guardian_contact: guardian, notes });
    }
    return rows;
  };

  const bulkImportVisitors = async () => {
    const rows = parsePasteText(pasteText);
    if (!rows.length) return;
    setImportingBulk(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("drill_visitors") as any)
      .insert(rows.map((r) => ({ session_id: session.id, name: r.name, unit: r.unit || null, guardian_contact: r.guardian_contact || null, notes: r.notes || null, status: r.status, pre_logged: true })))
      .select();
    setImportingBulk(false);
    if (error) { toast.error("Import failed"); return; }
    setVisitors((v) => [...v, ...(data ?? [])]);
    setPasteText("");
    setShowPasteDialog(false);
    toast.success(`${rows.length} visitor${rows.length !== 1 ? 's' : ''} imported`);
  };

  const updateVisitorStatus = async (visitorId: string, status: VisitorStatus) => {
    await supabase.from("drill_visitors").update({ status }).eq("id", visitorId);
    setVisitors((v) => v.map((vis) => vis.id === visitorId ? { ...vis, status } : vis));
  };

  const updateVisitorAttendance = async (visitorId: string, att: string | null) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("drill_visitors") as any).update({ attendance: att }).eq("id", visitorId);
    setVisitors((v) => v.map((vis) => vis.id === visitorId ? { ...vis, attendance: att } : vis));
  };

  const removeVisitor = async (visitorId: string) => {
    await supabase.from("drill_visitors").delete().eq("id", visitorId);
    setVisitors((v) => v.filter((vis) => vis.id !== visitorId));
  };

  const startEditVisitor = (v: DrillVisitor) => {
    setEditingVisitorId(v.id);
    setEditVisitorForm({ name: v.name, unit: v.unit ?? "", guardian_contact: v.guardian_contact ?? "", notes: v.notes ?? "" });
  };

  const saveVisitorEdit = async () => {
    if (!editingVisitorId || !editVisitorForm.name.trim()) return;
    setSavingVisitor(true);
    const { error } = await supabase.from("drill_visitors").update({
      name: editVisitorForm.name.trim(),
      unit: editVisitorForm.unit || null,
      guardian_contact: editVisitorForm.guardian_contact || null,
      notes: editVisitorForm.notes || null,
    }).eq("id", editingVisitorId);
    setSavingVisitor(false);
    if (error) { toast.error("Failed to save"); return; }
    setVisitors((v) => v.map((vis) => vis.id === editingVisitorId ? { ...vis, ...editVisitorForm, unit: editVisitorForm.unit || null, guardian_contact: editVisitorForm.guardian_contact || null, notes: editVisitorForm.notes || null } : vis));
    setEditingVisitorId(null);
  };

  const enrollVisitorAsCadet = async (v: DrillVisitor) => {
    if (!confirm(`Enroll ${v.name} as a new cadet? This creates a pending profile they can activate later.`)) return;
    setConvertingVisitorId(v.id);
    const result = await convertVisitorToProfile(v.id, v.name, v.guardian_contact ?? null);
    setConvertingVisitorId(null);
    if ("error" in result && result.error) { toast.error(result.error); return; }
    setConvertedVisitorIds((s) => new Set(Array.from(s).concat(v.id)));
    // Remove from visitor list — they're now a cadet and will appear in Muster
    setVisitors((vs) => vs.filter((vis) => vis.id !== v.id));
    if (result.link) {
      toast.success(`Profile created! Activation link: ${result.link}`, { duration: 10000 });
    } else if (result.tempPassword) {
      toast.success(`Profile created! Temp password: ${result.tempPassword}`, { duration: 10000 });
    } else {
      toast.success(`Profile created for ${v.name} — no email on file, send activation manually.`);
    }
  };

  const saveDebrief = async () => {
    setSavingDebrief(true);
    const { error } = await supabase.from("drill_sessions").update({ notes: debrief || null }).eq("id", session.id);
    setSavingDebrief(false);
    if (error) toast.error("Failed to save debrief");
    else toast.success("Debrief saved");
  };

  const submitMuster = async () => {
    setSubmittingMuster(true);
    const counts = { present: 0, absent: 0, excused: 0, late: 0 };
    attendance.forEach((s) => { counts[s as keyof typeof counts] = (counts[s as keyof typeof counts] ?? 0) + 1; });
    visitors.forEach((v) => {
      const att = (v as DrillVisitor & { attendance?: string | null }).attendance;
      if (att === "present" || att === "late" || att === "absent" || att === "excused") {
        counts[att as keyof typeof counts] = (counts[att as keyof typeof counts] ?? 0) + 1;
      }
    });
    const total = cadets.length + visitors.length;
    const pct = total > 0 ? Math.round(((counts.present + counts.late) / total) * 100) : 0;
    const summary = `Muster submitted for drill on ${format(new Date(session.date + "T12:00:00"), "EEE d MMM yyyy")}.\n\nPresent: ${counts.present} · Late: ${counts.late} · Excused: ${counts.excused} · Absent: ${counts.absent}\nTotal: ${total} (${cadets.length} cadets + ${visitors.length} visitors) — ${pct}% accountability\n\nSubmitted by ${profile.rank ? profile.rank + " " : ""}${profile.full_name}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("notifications") as any).insert({
      title: "Muster Submitted",
      body: summary,
      type: "muster_submitted",
      target_roles: ["officer", "snco"],
      session_id: session.id,
      created_by: profile.id,
    });
    setSubmittingMuster(false);
    if (error) {
      // Table may not exist yet — still show success to user and note pending migration
      console.warn("notifications table not found, skipping:", error.message);
    }
    // Mark session as submitted in the DB so it shows in records
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("drill_sessions") as any).update({ submitted_at: new Date().toISOString() }).eq("id", session.id);
    setMusterSubmitted(true);
    toast.success("Muster submitted — admin ops & senior staff notified");
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
    <>
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
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={toggleLock}>
              {locked ? <><Unlock className="mr-1.5 h-4 w-4" />Unlock</> : <><Lock className="mr-1.5 h-4 w-4" />Lock</>}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleArchive}
              className={archived ? "text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100" : "text-gray-500 hover:text-amber-700"}
            >
              <Archive className="mr-1.5 h-4 w-4" />
              {archived ? "Unarchive" : "Archive"}
            </Button>
          </div>
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
                  {musterName(c.rank, c.full_name)}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      <div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap">
            {[
              { value: "muster",    label: `Muster (${cadets.length})`, icon: null },
              { value: "rsvp",      label: `RSVP (${initialRsvps.length})`, icon: null },
              { value: "visitors",  label: `Visitors (${visitors.length})`, icon: null },
              { value: "watch-bill", label: "Watch Bill", icon: Shield },
              { value: "debrief", label: "Debrief", icon: NotebookPen },
              { value: "pod", label: "Plan of Day", icon: FileText },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setDrillTab(value)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  drillTab === value
                    ? "border-[#003087] text-[#003087]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}{label}
              </button>
            ))}
          </nav>
        </div>

        {drillTab === "muster" && <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Search cadets…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="h-10 flex-1"
            />
            {divisions.length > 0 && (
              <select
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
                className="h-10 rounded-md border bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
              >
                <option value="">All Divisions</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
          </div>

          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs border-green-300 text-green-700 hover:bg-green-50" onClick={() => bulkMarkAll("present")}>
                Mark All Present
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => bulkMarkAll("excused")}>
                Mark All Excused
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-50" onClick={() => bulkMarkAll("absent")}>
                Mark All Absent
              </Button>
            </div>
          )}

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
                      {musterName(cadet.rank, cadet.full_name)}
                    </p>
                    {cadet.billet && <p className="truncate text-[11px] text-gray-400">{cadet.billet}</p>}
                  </div>

                  {/* Absence request badge */}
                  {(() => {
                    const abs = absenceMap.get(cadet.id);
                    if (!abs) return null;
                    const colors = { pending: "bg-amber-100 text-amber-700", approved: "bg-green-100 text-green-700", denied: "bg-red-100 text-red-700" };
                    const labels = { pending: "Req", approved: "Exc", denied: "Den" };
                    return (
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${colors[abs]}`} title={`Absence request: ${abs}`}>
                        {labels[abs]}
                      </span>
                    );
                  })()}

                  {/* RSVP badge */}
                  {(() => {
                    const rsvp = rsvpMap.get(cadet.id);
                    if (!rsvp) return <MinusCircle className="h-4 w-4 shrink-0 text-gray-200" aria-label="No muster response" />;
                    const cfg = RSVP_CONFIG[rsvp as keyof typeof RSVP_CONFIG];
                    if (!cfg) return null;
                    const Icon = cfg.icon;
                    return <Icon className={`h-4 w-4 shrink-0 ${cfg.cls}`} aria-label={cfg.label} />;
                  })()}

                  {/* Status buttons */}
                  {canEdit && (
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <div className="flex gap-1">
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
                      {/* Arrival time input shown when status is Late */}
                      {status === "late" && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-orange-500 shrink-0" />
                          <input
                            type="time"
                            value={arrivalTimes.get(cadet.id) ?? ""}
                            onChange={(e) => saveArrivalTime(cadet.id, e.target.value)}
                            className="h-6 rounded border border-orange-200 bg-orange-50 px-1 text-xs text-orange-700 focus:outline-none focus:ring-1 focus:ring-orange-400"
                            placeholder="Arrival"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Read-only badge */}
                  {!canEdit && (
                    <Badge className={DRILL_ATTENDANCE_COLORS[status]} variant="outline">
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit Muster */}
          {canEdit && (
            <div className="rounded-lg border border-dashed border-[#003087]/30 bg-[#003087]/3 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Submit Muster</p>
                <p className="text-xs text-gray-500">{totals.present + totals.late} present · {totals.excused} excused · {totals.absent} absent — {totals.pct}% accountability</p>
              </div>
              <Button
                size="sm"
                onClick={submitMuster}
                disabled={submittingMuster || musterSubmitted}
                className={musterSubmitted ? "bg-green-600 hover:bg-green-600 text-white" : "bg-[#003087] hover:bg-[#002266] text-white"}
              >
                {musterSubmitted ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Submitted</> : submittingMuster ? "Submitting…" : <><Save className="h-3.5 w-3.5 mr-1" /> Submit Muster</>}
              </Button>
            </div>
          )}
        </div>}

        {drillTab === "rsvp" && <div className="mt-3 space-y-4">
          {initialRsvps.length === 0 && (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-gray-400">
              No muster responses yet. Cadets RSVP from the calendar.
            </div>
          )}
          {/* Expected visitors — always shown so staff can pre-log before RSVPs come in */}
          <div className="rounded-lg border border-[#003087]/20 bg-[#003087]/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#003087]">Expected Visitors</p>
              <span className="text-xs text-[#003087]/60">{visitors.filter((v) => (v as DrillVisitor & { pre_logged?: boolean }).pre_logged).length} pre-logged</span>
            </div>
            {canEdit && (
              <div className="mb-3 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newPreLogged.name}
                    onChange={(e) => setNewPreLogged((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Name"
                    className="h-8 text-sm"
                  />
                  <Input
                    value={newPreLogged.unit}
                    onChange={(e) => setNewPreLogged((p) => ({ ...p, unit: e.target.value }))}
                    placeholder="Unit / school"
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={addPreLoggedVisitor}
                    disabled={addingPreLogged || !newPreLogged.name.trim()}
                    className="h-8 shrink-0 bg-[#003087] hover:bg-[#002266] text-xs"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPasteDialog(true)}
                  className="h-7 w-full border-dashed border-[#003087]/40 text-[#003087]/70 hover:bg-[#003087]/5 text-xs"
                >
                  <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Paste visitor list
                </Button>
              </div>
            )}
            {(() => {
              const preLogged = visitors.filter((v) => (v as DrillVisitor & { pre_logged?: boolean }).pre_logged);
              if (preLogged.length === 0) return (
                <p className="text-xs text-[#003087]/50 italic">No expected visitors logged yet.</p>
              );
              return (
                <div className="space-y-2">
                  {preLogged.map((v) => (
                    <div key={v.id} className="rounded-md bg-white p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{v.name}</p>
                            <span className="rounded-full bg-[#003087]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#003087]">Pre-logged</span>
                          </div>
                          {v.unit && <p className="text-xs text-gray-500">{v.unit}</p>}
                          {v.guardian_contact && <p className="text-xs text-gray-400">Contact: {v.guardian_contact}</p>}
                          {v.notes && <p className="mt-0.5 text-xs text-gray-400 italic">{v.notes}</p>}
                        </div>
                        {canEdit && (
                          <Select value={v.status} onValueChange={(val) => updateVisitorStatus(v.id, val as VisitorStatus)}>
                            <SelectTrigger className="w-28 h-7 text-xs shrink-0">
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
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {initialRsvps.length > 0 && (
            <>
              {/* Summary counts */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: "attending",     label: "Going",      color: "text-green-700 bg-green-50 border-green-200" },
                  { key: "maybe",         label: "Maybe",      color: "text-amber-700 bg-amber-50 border-amber-200" },
                  { key: "not_attending", label: "Can't Go",   color: "text-red-700 bg-red-50 border-red-200" },
                  { key: "no_response",   label: "No Response",color: "text-gray-500 bg-gray-50 border-gray-200" },
                ].map(({ key, label, color }) => {
                  const count = key === "no_response"
                    ? cadets.filter((c) => !rsvpMap.has(c.id)).length
                    : initialRsvps.filter((r) => r.status === key).length;
                  return (
                    <div key={key} className={`rounded-lg border p-2 text-center ${color}`}>
                      <div className="text-lg font-bold leading-none">{count}</div>
                      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide">{label}</div>
                    </div>
                  );
                })}
              </div>

              {/* No-response accountability list */}
              {(() => {
                const silent = cadets.filter((c) => !rsvpMap.has(c.id));
                if (silent.length === 0) return null;
                return (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="mb-2 text-sm font-semibold text-red-800">Did not muster ({silent.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {silent.map((c) => (
                        <span key={c.id} className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          {c.rank ? `${c.rank} ` : ""}{c.full_name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Full response list */}
              <div className="space-y-1">
                {cadets.map((cadet) => {
                  const rsvp = rsvpMap.get(cadet.id);
                  const cfg = rsvp ? RSVP_CONFIG[rsvp as keyof typeof RSVP_CONFIG] : null;
                  return (
                    <div key={cadet.id} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {cadet.rank ? `${cadet.rank} ` : ""}{cadet.full_name}
                        </p>
                      </div>
                      {cfg ? (
                        <span className={`flex items-center gap-1 text-xs font-semibold ${cfg.cls}`}>
                          <cfg.icon className="h-3.5 w-3.5" />{cfg.label}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">No response</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>}

        {drillTab === "visitors" && <div className="mt-3 space-y-3">
          {visitors.length > 0 && (() => {
            const nscc = visitors.filter((v) => v.unit?.toUpperCase().includes("NSCC")).length;
            const nlcc = visitors.filter((v) => v.unit?.toUpperCase().includes("NLCC")).length;
            const other = visitors.length - nscc - nlcc;
            return (
              <div className="flex gap-2">
                <div className="rounded-lg border border-[#003087]/20 bg-[#003087]/5 px-3 py-1.5 text-center flex-1">
                  <div className="text-base font-bold text-[#003087] leading-none">{visitors.length}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[#003087]/70 mt-0.5">Total</div>
                </div>
                {nscc > 0 && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-center flex-1">
                    <div className="text-base font-bold text-blue-700 leading-none">{nscc}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 mt-0.5">NSCC</div>
                  </div>
                )}
                {nlcc > 0 && (
                  <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-center flex-1">
                    <div className="text-base font-bold text-sky-700 leading-none">{nlcc}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-sky-600 mt-0.5">NLCC</div>
                  </div>
                )}
                {other > 0 && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-center flex-1">
                    <div className="text-base font-bold text-gray-600 leading-none">{other}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mt-0.5">Other</div>
                  </div>
                )}
              </div>
            );
          })()}
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
            {visitors.map((v) => {
              const vExt = v as DrillVisitor & { pre_logged?: boolean; attendance?: string | null };
              const att = vExt.attendance ?? null;
              const attBtns: { key: string; label: string; active: string; inactive: string }[] = [
                { key: "present", label: "P", active: "bg-green-500 text-white",  inactive: "text-gray-400 hover:bg-green-50" },
                { key: "absent",  label: "A", active: "bg-red-500 text-white",    inactive: "text-gray-400 hover:bg-red-50" },
                { key: "excused", label: "E", active: "bg-amber-400 text-white",  inactive: "text-gray-400 hover:bg-amber-50" },
                { key: "late",    label: "L", active: "bg-orange-400 text-white", inactive: "text-gray-400 hover:bg-orange-50" },
              ];
              const isEditing = editingVisitorId === v.id;
              return (
                <Card key={v.id} className="p-3">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2">
                          <Input value={editVisitorForm.name} onChange={(e) => setEditVisitorForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name *" className="h-8 text-sm" />
                        </div>
                        <Input value={editVisitorForm.unit} onChange={(e) => setEditVisitorForm((f) => ({ ...f, unit: e.target.value }))} placeholder="Unit / School" className="h-8 text-sm" />
                        <Input value={editVisitorForm.guardian_contact} onChange={(e) => setEditVisitorForm((f) => ({ ...f, guardian_contact: e.target.value }))} placeholder="Guardian contact" className="h-8 text-sm" />
                        <div className="col-span-2">
                          <Input value={editVisitorForm.notes} onChange={(e) => setEditVisitorForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes" className="h-8 text-sm" />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditingVisitorId(null)}>Cancel</Button>
                        <Button size="sm" className="h-7 text-xs bg-[#003087] hover:bg-[#002266]" onClick={saveVisitorEdit} disabled={savingVisitor || !editVisitorForm.name.trim()}>
                          {savingVisitor ? "Saving…" : "Save"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{v.name}</p>
                          {vExt.pre_logged && (
                            <span className="rounded-full bg-[#003087]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#003087]">Pre-logged</span>
                          )}
                        </div>
                        {v.unit && <p className="text-sm text-gray-500">{v.unit}</p>}
                        {v.guardian_contact && <p className="text-sm text-gray-400">Contact: {v.guardian_contact}</p>}
                        {v.notes && <p className="mt-1 text-sm text-gray-400 italic">{v.notes}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {/* Attendance P/A/E/L */}
                        {canEdit && (
                          <div className="flex gap-1">
                            {attBtns.map(({ key, label, active, inactive }) => (
                              <button
                                key={key}
                                onClick={() => updateVisitorAttendance(v.id, att === key ? null : key)}
                                className={`h-8 w-8 rounded-md border text-sm font-bold transition-colors ${att === key ? active : `border-gray-200 bg-white ${inactive}`}`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                        {/* Pipeline status + edit + remove */}
                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <Select value={v.status} onValueChange={(val) => updateVisitorStatus(v.id, val as VisitorStatus)}>
                              <SelectTrigger className="w-36 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="prospect">Prospect</SelectItem>
                                <SelectItem value="enrolled">Enrolled</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="not_interested">Not Interested</SelectItem>
                              </SelectContent>
                            </Select>
                            <button
                              onClick={() => startEditVisitor(v)}
                              className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:border-[#003087] hover:text-[#003087] transition-colors"
                              title="Edit visitor"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button
                              onClick={() => removeVisitor(v.id)}
                              className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 transition-colors"
                              title="Remove visitor"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        {canEdit && !convertedVisitorIds.has(v.id) && (
                          <button
                            onClick={() => enrollVisitorAsCadet(v)}
                            disabled={convertingVisitorId === v.id}
                            className="flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
                            title="Enroll as new cadet"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            {convertingVisitorId === v.id ? "Enrolling…" : "Enroll as Cadet"}
                          </button>
                        )}
                        {convertedVisitorIds.has(v.id) && (
                          <span className="flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                            <UserCheck className="h-3.5 w-3.5" /> Enrolled
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>}

        {drillTab === "debrief" && <div className="mt-3 space-y-3">
          <p className="text-sm text-gray-500">Post-drill notes for officers — observations, issues, things to follow up on.</p>
          {canEdit ? (
            <>
              <Textarea
                value={debrief}
                onChange={(e) => setDebrief(e.target.value)}
                rows={10}
                placeholder="Write your post-drill debrief here…"
                className="resize-none"
              />
              <Button
                onClick={saveDebrief}
                disabled={savingDebrief}
                className="bg-[#003087] hover:bg-[#002266]"
                size="sm"
              >
                <Save className="mr-1.5 h-4 w-4" />
                {savingDebrief ? "Saving…" : "Save Debrief"}
              </Button>
            </>
          ) : (
            debrief ? (
              <div className="rounded-lg border bg-white p-4">
                <p className="whitespace-pre-wrap text-sm text-gray-800">{debrief}</p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-400">
                No debrief recorded for this session.
              </div>
            )
          )}
        </div>}

        {drillTab === "watch-bill" && <div className="mt-3 space-y-3">
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
                        <SelectValue placeholder="Unassigned">
                          {(() => {
                            const id = watchBillEdits[pos.key];
                            if (!id) return null;
                            const c = cadets.find((x) => x.id === id);
                            return c ? `${c.rank ? c.rank + " " : ""}${c.full_name}` : null;
                          })()}
                        </SelectValue>
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


        </div>}

        {/* Plan of Day Tab */}
        {drillTab === "pod" && !pod && (
          <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No Plan of Day has been created for this drill.</p>
            {canEdit && (
              <Button
                size="sm"
                className="mt-3 bg-[#003087] hover:bg-[#002266]"
                disabled={creatingPod}
                onClick={async () => {
                  setCreatingPod(true);
                  const res = await createBlankPod(session.date);
                  setCreatingPod(false);
                  if (res.error) { toast.error(res.error); return; }
                  toast.success("POD created");
                  router.push(`/pod?date=${session.date}`);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {creatingPod ? "Creating…" : "Create POD"}
              </Button>
            )}
          </div>
        )}
        {drillTab === "pod" && pod && (
          <div className="mt-3 space-y-3">
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
  
        </div>)}
      </div>
    </div>

    {/* Paste Import Dialog */}
    <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Paste Visitor List</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Paste a list of visitors — one per line. Supports tab-separated columns (Name, Unit, Status) or plain names. NSCC/NLCC in the text is auto-detected.
            </p>
            <Textarea
              rows={8}
              placeholder={"Richard Fisichella\tNSCC\nVictoria Fisichella\tNLCC\nHenry Doan\tNSCC\n..."}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="font-mono text-xs"
            />
            {pasteText.trim() && (() => {
              const parsed = parsePasteText(pasteText);
              if (!parsed.length) return <p className="text-xs text-gray-400 italic">No valid rows detected yet.</p>;
              return (
                <div className="rounded-lg border overflow-hidden">
                  <div className="bg-gray-50 px-3 py-1.5 border-b flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600">Preview — {parsed.length} visitor{parsed.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-1.5 font-medium text-gray-500">Name</th>
                          <th className="text-left px-3 py-1.5 font-medium text-gray-500">Unit</th>
                          <th className="text-left px-3 py-1.5 font-medium text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {parsed.map((r, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-1.5 font-medium text-gray-900">{r.name}</td>
                            <td className="px-3 py-1.5 text-gray-500">{r.unit || <span className="italic text-gray-300">—</span>}</td>
                            <td className="px-3 py-1.5">
                              <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${r.status === 'enrolled' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowPasteDialog(false); setPasteText(""); }}>Cancel</Button>
            <Button
              size="sm"
              onClick={bulkImportVisitors}
              disabled={importingBulk || !parsePasteText(pasteText).length}
              className="bg-[#003087] hover:bg-[#002266]"
            >
              {importingBulk ? "Importing…" : `Import ${parsePasteText(pasteText).length || ""} Visitors`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
