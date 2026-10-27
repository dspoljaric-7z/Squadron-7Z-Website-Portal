"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  QUAL_TYPES as QUAL_TYPES_FALLBACK,
  QUAL_STATUS_LABELS,
  QUAL_STATUS_COLORS,
  ATTENDANCE_COLORS,
} from "@/lib/constants";
import { initials, roleLabel, computedTrainingPhase, allBillets } from "@/lib/format";
import { format, formatDistanceToNow } from "date-fns";
import type { Profile, Qualification, Attendance, Correction, Pip, PipTask, Event, NominationStage } from "@/types/database";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { isAfter, addDays, parseISO } from "date-fns";
import {
  TrendingUp,
  CheckSquare,
  AlertTriangle,
  Calendar,
  Shield,
  ClipboardCheck,
  Award,
  Clock,
  Phone,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type AttWithEvent = Attendance & { events: { title: string; start_time: string } | null };
type PipWithTasks = Pip & { pip_tasks?: PipTask[] };
type NominationRow = { id: string; billet_name: string; stage: NominationStage; created_at: string };

const STAGE_LABELS: Record<string, string> = {
  nominated: "Nominated",
  applied: "Applied",
  interviewed: "Interviewed",
  approved_probation: "Probation",
  confirmed: "Confirmed",
  not_selected: "Not Selected",
};

type PaperworkRow = { id: string; document_type_id: string; expiry_date: string | null; status: string; submitted_at: string | null; document_types: { name: string } | null };
type InspHistoryRow = { passed: boolean; scores: Record<string, number> | null; created_at: string; uniform_inspection_sessions: { date: string } | null };

interface MyRecordClientProps {
  profile: Profile;
  attendance: AttWithEvent[];
  quals: Qualification[];
  openCorrections: Correction[];
  openPips: PipWithTasks[];
  upcomingEvents: Event[];
  qualTypes?: string[];
  activeNominations?: NominationRow[];
  paperwork?: PaperworkRow[];
  inspectionHistory?: InspHistoryRow[];
}

export function MyRecordClient({
  profile,
  attendance,
  quals,
  openCorrections,
  openPips,
  upcomingEvents,
  qualTypes = QUAL_TYPES_FALLBACK,
  activeNominations = [],
  paperwork = [],
  inspectionHistory = [],
}: MyRecordClientProps) {
  const [phoneEdit, setPhoneEdit] = useState(false);
  const [phoneVal, setPhoneVal] = useState(profile.contact_phone ?? "");
  const [savingPhone, setSavingPhone] = useState(false);

  const savePhone = async () => {
    setSavingPhone(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb.from("profiles").update({ contact_phone: phoneVal || null }).eq("id", profile.id);
    setSavingPhone(false);
    if (error) { toast.error("Failed to save phone"); return; }
    toast.success("Contact info updated");
    setPhoneEdit(false);
  };

  const total = attendance.length;
  const present = attendance.filter((a) => a.status === "present").length;
  const excused = attendance.filter((a) => a.status === "excused").length;
  const absent = attendance.filter((a) => a.status === "absent").length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  const qualMap: Record<string, string> = {};
  for (const q of quals) qualMap[q.qual_type] = q.status;
  const qualsDone = qualTypes.filter((qt) => qualMap[qt] === "completed").length;
  const qualsInProgress = qualTypes.filter((qt) => qualMap[qt] === "in_progress").length;

  const nextDrill = upcomingEvents.find((e) => e.event_type === "drill");
  const trainingPhase = computedTrainingPhase(profile.rank ?? null);
  const actionItems = openCorrections.length + openPips.length;

  const attPctColor =
    pct >= 80 ? "text-green-600" : pct >= 60 ? "text-amber-600" : "text-red-600";
  const attBarColor =
    pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Record</h1>
          <p className="text-sm text-gray-500">
            Personal service record &middot; {format(new Date(), "MMMM d, yyyy")}
          </p>
        </div>
        {actionItems > 0 && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-700">
            <AlertTriangle className="h-4 w-4" />
            {actionItems} action item{actionItems !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Profile card */}
      <div className="rounded-xl border bg-[#003087] p-5 text-white shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl font-bold ring-2 ring-white/20">
            {initials(profile.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {profile.rank && (
                <span className="text-sm font-bold text-[#C9A84C]">{profile.rank}</span>
              )}
              <h2 className="text-lg font-bold leading-tight">{profile.full_name}</h2>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {allBillets(profile).map((b) => (
                <span
                  key={b}
                  className="rounded bg-white/10 px-2 py-0.5 text-xs font-medium text-white/80"
                >
                  {b}
                </span>
              ))}
              <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-medium text-white/60">
                {roleLabel(profile.role)}
              </span>
            </div>
            {trainingPhase && (
              <p className="mt-1 text-xs font-medium text-[#C9A84C]/80">{trainingPhase}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            {profile.join_date && (
              <>
                <p className="text-[10px] uppercase tracking-wider text-white/40">Joined</p>
                <p className="text-sm font-semibold text-white/80">
                  {format(new Date(profile.join_date), "MMM yyyy")}
                </p>
              </>
            )}
            {profile.date_of_rank && (
              <>
                <p className="mt-1.5 text-[10px] uppercase tracking-wider text-white/40">
                  Date of rate
                </p>
                <p className="text-sm font-semibold text-white/80">
                  {format(new Date(profile.date_of_rank), "MMM d, yyyy")}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Attendance
            </p>
            <TrendingUp className={`h-4 w-4 ${attPctColor}`} />
          </div>
          <p className={`mt-2 text-3xl font-extrabold ${attPctColor}`}>{pct}%</p>
          <p className="mt-0.5 text-xs text-gray-400">
            {present}/{total} events
          </p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
            <div
              className={`h-1.5 rounded-full ${attBarColor} transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Quals
            </p>
            <CheckSquare className="h-4 w-4 text-[#003087]" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-[#003087]">
            {qualsDone}
            <span className="text-lg text-gray-300">/{qualTypes.length}</span>
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {qualsInProgress > 0 ? `${qualsInProgress} in progress` : "completed"}
          </p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
            <div
              className="h-1.5 rounded-full bg-[#003087] transition-all"
              style={{ width: `${(qualsDone / qualTypes.length) * 100}%` }}
            />
          </div>
        </div>

        <div
          className={`rounded-xl border p-4 shadow-sm ${
            actionItems > 0 ? "border-red-200 bg-red-50" : "bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <p
              className={`text-xs font-semibold uppercase tracking-wide ${
                actionItems > 0 ? "text-red-400" : "text-gray-400"
              }`}
            >
              Status
            </p>
            <Shield
              className={`h-4 w-4 ${actionItems > 0 ? "text-red-500" : "text-green-500"}`}
            />
          </div>
          {actionItems > 0 ? (
            <>
              <p className="mt-2 text-3xl font-extrabold text-red-600">{actionItems}</p>
              <p className="mt-0.5 text-xs text-red-400">
                open item{actionItems !== 1 ? "s" : ""}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-2xl font-extrabold text-green-600">Clear</p>
              <p className="mt-0.5 text-xs text-gray-400">no open items</p>
            </>
          )}
        </div>
      </div>

      {/* Next drill */}
      {nextDrill && (
        <Link
          href="/calendar"
          className="flex items-center gap-3 rounded-xl border border-[#003087]/10 bg-[#003087]/5 p-4 transition-colors hover:bg-[#003087]/10"
        >
          <Calendar className="h-5 w-5 shrink-0 text-[#003087]" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-[#003087]/50">
              Next Drill
            </p>
            <p className="font-semibold text-[#003087]">{nextDrill.title}</p>
            <p className="text-sm text-[#003087]/70">
              {format(new Date(nextDrill.start_time), "EEEE, MMMM d")} at{" "}
              {format(new Date(nextDrill.start_time), "HH:mm")}
              {nextDrill.location ? ` · ${nextDrill.location}` : ""}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#003087]/10 px-3 py-1 text-xs font-bold text-[#003087]">
            {formatDistanceToNow(new Date(nextDrill.start_time), { addSuffix: true })}
          </span>
        </Link>
      )}

      {/* Active nominations */}
      {activeNominations.length > 0 && (
        <div className="rounded-xl border border-[#003087]/20 bg-[#003087]/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-[#003087]" />
            <p className="text-sm font-bold text-[#003087]">Active Billet Nominations</p>
          </div>
          <div className="space-y-2">
            {activeNominations.map((n) => (
              <div key={n.id} className="flex items-center justify-between rounded-lg border border-[#003087]/10 bg-white px-3 py-2">
                <p className="text-sm font-medium text-gray-800">{n.billet_name}</p>
                <Badge variant="outline" className="text-xs text-[#003087] border-[#003087]/30">
                  {STAGE_LABELS[n.stage] ?? n.stage}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open corrections / PIPs */}
      {actionItems > 0 && (
        <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <p className="text-sm font-bold text-red-800">Action Required</p>
          </div>
          {openCorrections.map((c) => (
            <div
              key={c.id}
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-white p-3"
            >
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-700">
                Tier {c.tier}
              </span>
              <p className="flex-1 text-sm text-gray-700">{c.description}</p>
            </div>
          ))}
          {openPips.map((p) => (
            <PipItem key={p.id} pip={p} />
          ))}
        </div>
      )}

      {/* Expiring quals warning */}
      {(() => {
        const now = new Date();
        const soon = addDays(now, 30);
        const expiring = quals.filter((q) => {
          const ext = q as unknown as { expires_at?: string | null; never_expires?: boolean };
          if (ext.never_expires) return false;
          if (!ext.expires_at) return false;
          const d = parseISO(ext.expires_at);
          return !isAfter(d, soon);
        });
        if (expiring.length === 0) return null;
        return (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-bold text-amber-800">Qual Expiration Alert</p>
            </div>
            <div className="space-y-2">
              {expiring.map((q) => {
                const ext = q as unknown as { expires_at: string };
                const d = parseISO(ext.expires_at);
                const expired = !isAfter(d, now);
                return (
                  <div key={q.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-3 py-2">
                    <p className="text-sm font-medium text-gray-800">{q.qual_type}</p>
                    <span className={`text-xs font-semibold ${expired ? "text-red-600" : "text-amber-600"}`}>
                      {expired ? `Expired ${format(d, "MMM d, yyyy")}` : `Expires ${format(d, "MMM d, yyyy")}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Quals + Attendance grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Qualifications */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold text-gray-800">Qualifications</h2>
            <span className="text-xs text-gray-400">
              {qualsDone}/{qualTypes.length} complete
            </span>
          </div>
          <div className="divide-y">
            {qualTypes.map((qt) => {
              const status = (qualMap[qt] ?? "not_started") as
                | "not_started"
                | "in_progress"
                | "completed";
              return (
                <div key={qt} className="flex items-center justify-between px-4 py-2.5">
                  <p className="text-sm text-gray-700">{qt}</p>
                  <Badge variant="outline" className={QUAL_STATUS_COLORS[status]}>
                    {status === "completed" && "✓ "}
                    {QUAL_STATUS_LABELS[status]}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attendance history */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold text-gray-800">Attendance History</h2>
            <div className="flex items-center gap-3 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />P: {present}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />E: {excused}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-red-400" />A: {absent}
              </span>
            </div>
          </div>
          <div className="max-h-[340px] divide-y overflow-y-auto">
            {attendance.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">
                No attendance records yet.
              </p>
            ) : (
              attendance.slice(0, 30).map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {a.events?.title ?? "Event"}
                    </p>
                    {a.events?.start_time && (
                      <p className="text-xs text-gray-400">
                        {format(new Date(a.events.start_time), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className={ATTENDANCE_COLORS[a.status]}>
                    {a.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Paperwork */}
      {paperwork.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold text-gray-800">My Documents</h2>
            <span className="text-xs text-gray-400">{paperwork.length} records</span>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {paperwork.map((p) => {
              const expired = p.expiry_date && p.expiry_date < new Date().toISOString().split("T")[0];
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                  <p className="text-sm text-gray-800 truncate flex-1">{p.document_types?.name ?? "Document"}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.expiry_date && (
                      <span className={`text-xs ${expired ? "text-red-600 font-semibold" : "text-gray-400"}`}>
                        {expired ? "Expired" : "Exp"} {format(new Date(p.expiry_date), "M/d/yy")}
                      </span>
                    )}
                    <Badge variant="outline" className={p.status === "collected" ? "text-green-700 border-green-300" : ""}>
                      {p.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inspection history */}
      {inspectionHistory.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold text-gray-800">Inspection History</h2>
            <span className="text-xs text-gray-400">
              {inspectionHistory.filter((r) => r.passed).length}/{inspectionHistory.length} passed
            </span>
          </div>
          {/* Sparkline */}
          <div className="flex items-end gap-1 px-4 pt-3 pb-1 h-12">
            {[...inspectionHistory].reverse().map((r, i) => {
              const vals = r.scores ? Object.values(r.scores as Record<string, number>).filter((v) => v > 0) : [];
              const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
              const h = avg > 0 ? Math.max(4, Math.round((avg / 4) * 28)) : 4;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm transition-all ${r.passed ? "bg-green-400" : "bg-red-400"}`}
                  style={{ height: `${h}px` }}
                  title={`${avg.toFixed(1)}/4.0`}
                />
              );
            })}
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {inspectionHistory.map((r, i) => {
              const vals = r.scores ? Object.values(r.scores as Record<string, number>).filter((v) => v > 0) : [];
              const avg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
              return (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <p className="text-sm text-gray-800">
                    {r.uniform_inspection_sessions?.date
                      ? format(new Date(r.uniform_inspection_sessions.date), "MMM d, yyyy")
                      : format(new Date(r.created_at), "MMM d, yyyy")}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {avg && <span className="text-xs text-gray-400">{avg}/4.0</span>}
                    <Badge variant="outline" className={r.passed ? "text-green-700 border-green-300" : "text-red-600 border-red-300"}>
                      {r.passed ? "PASS" : "FAIL"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contact info self-update */}
      <div className="rounded-xl border bg-white shadow-sm">
        <button
          onClick={() => setPhoneEdit(!phoneEdit)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-[#003087]" />
            <span className="text-sm font-semibold text-gray-800">Update Contact Info</span>
            {profile.contact_phone && !phoneEdit && (
              <span className="text-xs text-gray-400">{profile.contact_phone}</span>
            )}
          </div>
          {phoneEdit ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>
        {phoneEdit && (
          <div className="border-t px-4 py-3 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneVal}
                onChange={(e) => setPhoneVal(e.target.value)}
                placeholder="(555) 555-5555"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#003087] focus:outline-none focus:ring-1 focus:ring-[#003087]"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={savePhone} disabled={savingPhone} className="bg-[#003087] hover:bg-[#003087]/80 text-white">
                {savingPhone ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setPhoneEdit(false); setPhoneVal(profile.contact_phone ?? ""); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PipItem({ pip }: { pip: PipWithTasks }) {
  const [acking, setAcking] = useState(false);
  const [acked, setAcked] = useState(false);
  const isPendingAck = (pip as unknown as { status: string }).status === "pending_ack";

  const acknowledge = async () => {
    setAcking(true);
    const supabase = createClient();
    const { error } = await supabase.from("pips").update({
      status: "closed",
      cadet_acknowledged_at: new Date().toISOString(),
    } as never).eq("id", pip.id);
    setAcking(false);
    if (error) { toast.error("Failed to acknowledge PIP"); return; }
    setAcked(true);
    toast.success("PIP acknowledged and closed");
  };

  if (acked) return null;

  return (
    <div className={`flex items-start gap-2 rounded-lg border p-3 ${isPendingAck ? "border-blue-200 bg-blue-50" : "border-orange-200 bg-white"}`}>
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${isPendingAck ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
            PIP {isPendingAck ? "— Pending Acknowledgment" : "— Open"}
          </span>
        </div>
        <p className="text-sm text-gray-700">{pip.root_cause}</p>
        {pip.pip_tasks && pip.pip_tasks.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Action items</p>
            {pip.pip_tasks.map((t) => (
              <div key={t.id} className="flex items-start gap-2 text-xs text-gray-600">
                <span className={`mt-0.5 shrink-0 ${t.completed_at ? "text-green-500" : "text-gray-300"}`}>
                  {t.completed_at ? "✓" : "○"}
                </span>
                <span className={t.completed_at ? "line-through text-gray-400" : ""}>{t.description}</span>
                {t.due_date && !t.completed_at && (
                  <span className="ml-auto shrink-0 text-gray-400">{format(parseISO(t.due_date), "MMM d")}</span>
                )}
              </div>
            ))}
          </div>
        )}
        {isPendingAck && (
          <div className="space-y-1">
            <p className="text-xs text-blue-700">Your supervisor has closed this PIP. Please review and acknowledge to complete the close-out.</p>
            <Button size="sm" className="h-7 gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={acknowledge} disabled={acking}>
              <ClipboardCheck className="h-3.5 w-3.5" />
              {acking ? "Acknowledging…" : "Acknowledge & Close"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
