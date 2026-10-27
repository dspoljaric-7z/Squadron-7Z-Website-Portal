"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO } from "date-fns";
import {
  X, ExternalLink, ClipboardList, CalendarOff, Shirt, Target, ScrollText,
  Users, CheckCircle2, Clock, AlertCircle, Ship, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Profile } from "@/types/database";

type PodData = {
  id: string;
  date: string;
  status: string | null;
  training_objective: string | null;
  uniform_of_day: string | null;
  notes: string | null;
  watch_bill: string | null;
};

type AttendanceSummary = { total: number; present: number; absent: number; excused: number };

type AbsenceRow = { id: string; status: string };

export type DrillModalEntry = {
  date: string;
  title: string;
  theme: string | null;
  notes: string | null;
  hasSession: boolean;
  locked: boolean;
  sessionId?: string;
  kind: "sq7z" | "tsw";
  tswTitle?: string | null;
  hasSq7z?: boolean;
  hasTsw?: boolean;
};

function AbsenceRequestInline({ date, profile, onClose }: { date: string; profile: Profile; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("");

  const submit = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("absence_requests").insert({
      cadet_id: profile.id,
      requested_date: date,
      reason: reason.trim(),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Absence request submitted.");
    onClose();
  };

  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">Request Absence — {format(parseISO(date), "MMM d, yyyy")}</p>
      <div className="space-y-1.5">
        <Label className="text-xs">Reason *</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Briefly explain why you will be absent…"
          rows={2}
          className="text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        <Button
          size="sm"
          disabled={saving || !reason.trim()}
          onClick={submit}
          className="flex-1 bg-amber-700 text-white hover:bg-amber-800"
        >
          {saving ? "Submitting…" : "Submit"}
        </Button>
      </div>
    </div>
  );
}

function EarlyLeaveInline({ date, profile, onClose }: { date: string; profile: Profile; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [departureTime, setDepartureTime] = useState("");
  const [reason, setReason] = useState("");

  const submit = async () => {
    if (!departureTime || !reason.trim()) return;
    setSaving(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("absence_requests").insert({
      cadet_id: profile.id,
      requested_date: date,
      reason: `[EARLY LEAVE — ${departureTime}] ${reason.trim()}`,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Early leave request submitted.");
    onClose();
  };

  return (
    <div className="space-y-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
      <p className="text-sm font-semibold text-orange-900">Request Early Leave — {format(parseISO(date), "MMM d, yyyy")}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Departure Time *</Label>
          <Input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} className="text-sm" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Reason *</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for early departure…"
            rows={2}
            className="text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        <Button
          size="sm"
          disabled={saving || !departureTime || !reason.trim()}
          onClick={submit}
          className="flex-1 bg-orange-700 text-white hover:bg-orange-800"
        >
          {saving ? "Submitting…" : "Submit"}
        </Button>
      </div>
    </div>
  );
}

export function DrillDetailModal({
  entry,
  onClose,
  profile,
}: {
  entry: DrillModalEntry | null;
  onClose: () => void;
  profile: Profile;
}) {
  const [sq7zPod, setSq7zPod] = useState<PodData | null>(null);
  const [tswPod, setTswPod] = useState<PodData | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [tswAttendance, setTswAttendance] = useState<AttendanceSummary | null>(null);
  const [myAbsence, setMyAbsence] = useState<AbsenceRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<"absence" | "early" | null>(null);
  const isBoth = !!(entry?.hasSq7z && entry?.hasTsw);
  const isStaff = profile.role === "officer" || profile.role === "snco" || profile.role === "nco";

  // Escape key closes modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (!entry) { setSq7zPod(null); setTswPod(null); setAttendance(null); setTswAttendance(null); setMyAbsence(null); setAction(null); return; }
    setLoading(true);
    setAction(null);
    const supabase = createClient();

    const showSq7z = entry.hasSq7z ?? entry.kind === "sq7z";
    const showTsw = entry.hasTsw ?? entry.kind === "tsw";

    const sq7zPodFetch = showSq7z
      ? Promise.resolve(
          supabase.from("plan_of_day").select("id, date, status, training_objective, uniform_of_day, notes, watch_bill").eq("date", entry.date).maybeSingle()
        ).then(({ data }) => setSq7zPod(data as PodData | null))
      : Promise.resolve();

    const tswPodFetch = showTsw
      ? Promise.resolve(
          supabase.from("tsw_calendar").select("id, date, plan, notes").eq("date", entry.date).maybeSingle()
        ).then(({ data }) => {
          if (data) {
            setTswPod({ id: (data as { id: string }).id, date: entry.date, status: null, training_objective: null, uniform_of_day: null, notes: (data as { notes: string | null }).notes, watch_bill: (data as { plan: string | null }).plan });
          } else {
            setTswPod(null);
          }
        })
      : Promise.resolve();

    // Attendance: query drill_attendance table directly to avoid relation type issues
    const attendanceFetch = (entry.hasSession && entry.kind === "sq7z")
      ? Promise.resolve(
          supabase.from("drill_sessions").select("id").eq("date", entry.date).maybeSingle()
        ).then(async ({ data: session }) => {
          if (!session) return;
          const { data: rows } = await supabase
            .from("drill_attendance" as never)
            .select("status")
            .eq("drill_session_id", (session as { id: string }).id);
          const attendance = (rows ?? []) as { status: string }[];
          const present = attendance.filter((r) => r.status === "present").length;
          const excused = attendance.filter((r) => r.status === "excused").length;
          const absent = attendance.filter((r) => r.status === "absent").length;
          setAttendance({ total: attendance.length, present, excused, absent });
        })
      : Promise.resolve();

    const absenceFetch = Promise.resolve(
      supabase.from("absence_requests" as never).select("id, status").eq("cadet_id", profile.id).eq("requested_date", entry.date).maybeSingle()
    ).then(({ data }) => {
      setMyAbsence(data as AbsenceRow | null);
    });

    Promise.all([sq7zPodFetch, tswPodFetch, attendanceFetch, absenceFetch]).finally(() => setLoading(false));
  }, [entry, profile.id]);

  if (!entry) return null;

  const drillUrl = entry.hasSession ? `/drill` : null;

  const statusBadge = (status: string | null) => {
    if (!status) return null;
    const map: Record<string, string> = { approved: "bg-green-100 text-green-700", draft: "bg-gray-100 text-gray-600", submitted: "bg-blue-100 text-blue-700", rejected: "bg-red-100 text-red-700" };
    return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", map[status] ?? "bg-gray-100 text-gray-600")}>{status}</span>;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl p-5 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-blue-700" />
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                {isBoth ? "SQ7Z + TSW Drill" : entry.hasSq7z ? "SQ7Z Drill" : "TSW Drill"}
              </span>
            </div>
            <h2 className="text-lg font-bold text-gray-900">{entry.title}</h2>
            <p className="text-sm text-gray-500">{format(parseISO(entry.date), "EEEE, MMMM d, yyyy")}</p>
            {entry.theme && entry.title !== entry.theme && (
              <p className="mt-0.5 text-xs text-gray-400">{entry.theme}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Attendance summary — staff only */}
        {isStaff && attendance && (entry.hasSq7z ?? entry.kind === "sq7z") && (
          <div className="rounded-xl bg-gray-50 p-3 space-y-2">
            {isBoth && <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">SQ7Z Attendance</p>}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">{attendance.present}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Present</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-600">{attendance.excused}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Excused</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-500">{attendance.absent}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Absent</p>
              </div>
            </div>
            {isBoth && (
              <>
                <div className="border-t border-gray-200 pt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-700 mb-1">TSW Attendance</p>
                  <p className="text-xs text-gray-400">TSW roll call not yet tracked in the system.</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* POD info */}
        {loading ? (
          <p className="text-sm text-gray-400">Loading details…</p>
        ) : (
          <div className="space-y-3">
            {/* SQ7Z POD */}
            {(entry.hasSq7z ?? entry.kind === "sq7z") && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-700">SQ7Z Plan of Day</p>
                  <div className="flex items-center gap-1.5">
                    {sq7zPod && statusBadge(sq7zPod.status)}
                    {isStaff && (
                      <Link href={`/pod?date=${entry.date}&edit=true`} className="text-blue-400 hover:text-blue-600 transition-colors" title="Edit SQ7Z POD">
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
                {sq7zPod ? (
                  <>
                    {sq7zPod.training_objective && (
                      <div className="flex gap-2">
                        <Target className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        <p className="text-sm text-blue-900">{sq7zPod.training_objective}</p>
                      </div>
                    )}
                    {sq7zPod.uniform_of_day && (
                      <div className="flex gap-2">
                        <Shirt className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                        <p className="text-sm text-gray-700"><span className="font-medium">Uniform:</span> {sq7zPod.uniform_of_day}</p>
                      </div>
                    )}
                    {sq7zPod.watch_bill && (
                      <div className="flex gap-2">
                        <ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Watch Bill</p>
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{sq7zPod.watch_bill}</pre>
                        </div>
                      </div>
                    )}
                    {sq7zPod.notes && <p className="text-sm text-gray-600 whitespace-pre-wrap">{sq7zPod.notes}</p>}
                  </>
                ) : (
                  <p className="text-xs text-blue-400">No SQ7Z POD written yet.</p>
                )}
              </div>
            )}

            {/* TSW POD */}
            {(entry.hasTsw ?? entry.kind === "tsw") && (
              <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-700">TSW Plan of Day</p>
                  <div className="flex items-center gap-1.5">
                    <Ship className="h-3.5 w-3.5 text-orange-400" />
                    {(profile.role === "officer" || profile.role === "snco" || !!profile.can_manage_pod) && (
                      <Link href={`/tsw-pod?date=${entry.date}&edit=true`} className="text-orange-400 hover:text-orange-600 transition-colors" title="Edit TSW POD">
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
                {tswPod ? (
                  <>
                    {tswPod.watch_bill && (
                      <div className="flex gap-2">
                        <ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Plan</p>
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{tswPod.watch_bill}</pre>
                        </div>
                      </div>
                    )}
                    {tswPod.notes && <p className="text-sm text-gray-600 whitespace-pre-wrap">{tswPod.notes}</p>}
                  </>
                ) : (
                  <p className="text-xs text-orange-400">No TSW POD written yet.</p>
                )}
              </div>
            )}

            {!sq7zPod && !tswPod && !loading && (
              <p className="rounded-lg border border-dashed border-gray-200 p-3 text-center text-sm text-gray-400">
                No Plan of Day written yet for this drill.
              </p>
            )}
          </div>
        )}

        {/* My absence status */}
        {myAbsence && (
          <div className={cn(
            "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm",
            myAbsence.status === "approved" && "border-green-200 bg-green-50 text-green-800",
            myAbsence.status === "pending" && "border-amber-200 bg-amber-50 text-amber-800",
            myAbsence.status === "denied" && "border-red-200 bg-red-50 text-red-800",
          )}>
            {myAbsence.status === "approved" ? <CheckCircle2 className="h-4 w-4" /> : myAbsence.status === "pending" ? <Clock className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span className="font-medium capitalize">Absence {myAbsence.status}</span>
            {myAbsence.status === "pending" && <span className="text-xs opacity-70">— awaiting staff review</span>}
          </div>
        )}

        {/* Inline absence / early leave forms */}
        {action === "absence" && (
          <AbsenceRequestInline date={entry.date} profile={profile} onClose={() => setAction(null)} />
        )}
        {action === "early" && (
          <EarlyLeaveInline date={entry.date} profile={profile} onClose={() => setAction(null)} />
        )}

        {/* Action buttons */}
        <div className="space-y-2">
          {/* Request absence — show if no existing request and no form open */}
          {!myAbsence && !action && profile.role !== "parent" && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50"
                onClick={() => setAction("absence")}
              >
                <CalendarOff className="h-4 w-4" />
                Request Absence
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 border-orange-300 text-orange-800 hover:bg-orange-50"
                onClick={() => setAction("early")}
              >
                Request Early Leave
              </Button>
            </div>
          )}

          {/* Navigation links */}
          <div className="flex flex-wrap gap-2">
            {(entry.hasSq7z ?? entry.kind === "sq7z") && (
              <Link
                href={`/pod?date=${entry.date}`}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100 transition-colors"
              >
                <ClipboardList className="h-4 w-4" />
                SQ7Z POD
                <ExternalLink className="h-3 w-3 opacity-50" />
              </Link>
            )}
            {(entry.hasTsw ?? entry.kind === "tsw") && (
              <Link
                href={`/tsw-pod?date=${entry.date}`}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-800 hover:bg-orange-100 transition-colors"
              >
                <Ship className="h-4 w-4" />
                TSW POD
                <ExternalLink className="h-3 w-3 opacity-50" />
              </Link>
            )}
            {drillUrl && (entry.hasSq7z ?? entry.kind === "sq7z") && (
              <Link
                href={drillUrl}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Users className="h-4 w-4" />
                Drill Muster
                <ExternalLink className="h-3 w-3 opacity-50" />
              </Link>
            )}
          </div>

          {isStaff && (
            <div className="flex gap-2">
              <Link
                href="/absence-requests"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <CalendarOff className="h-4 w-4" />
                Review Absence Requests
                <ExternalLink className="h-3 w-3 opacity-50" />
              </Link>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
