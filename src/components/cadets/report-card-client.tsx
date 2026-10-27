"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { CheckSquare, Square, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

type AttRow = { status: string; recorded_at: string; events: { title: string } | null };
type InspRow = { passed: boolean; scores: Record<string, number> | null; created_at: string; uniform_inspection_sessions: { date: string } | null };
type QualRow = { status: string };
type CorrRow = { status: string };

const RANK_ORDER = ["SR", "SA", "SN", "PO3", "PO2", "PO1", "CPO"];

const ONBOARDING_STEPS = [
  { key: "account_created", label: "Portal account created" },
  { key: "paperwork_submitted", label: "Paperwork submitted" },
  { key: "uniform_issued", label: "Uniform issued" },
  { key: "first_inspection_passed", label: "First inspection passed" },
  { key: "qual_brief_done", label: "Qualification brief" },
];

function avgScore(scores: Record<string, number> | null): number | null {
  if (!scores) return null;
  const vals = Object.values(scores).filter((v) => v > 0);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function ReportCardClient({
  cadet,
  attendance,
  inspectionResults,
  quals,
  qualTypes,
  corrections,
  billet,
  checklists,
}: {
  cadet: { id: string; full_name: string; rank: string | null; role: string; created_at: string; division_id?: string | null };
  attendance: AttRow[];
  inspectionResults: InspRow[];
  quals: QualRow[];
  qualTypes: string[];
  corrections: CorrRow[];
  billet: { name: string } | null;
  paperwork: unknown[];
  checklists: { type: string; step: string; completed: boolean }[];
}) {
  const totalAtt = attendance.length;
  const presentAtt = attendance.filter((a) => a.status === "present").length;
  const attPct = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : null;

  const completedQuals = quals.filter((q) => q.status === "completed").length;
  const openCorrections = corrections.filter((c) => c.status === "open").length;

  const inspPasses = inspectionResults.filter((r) => r.passed).length;
  const inspTotal = inspectionResults.length;
  const passRate = inspTotal > 0 ? Math.round((inspPasses / inspTotal) * 100) : null;

  const recentInspections = inspectionResults.slice(0, 6);

  const onboardingDone = ONBOARDING_STEPS.filter((s) =>
    checklists.find((c) => c.type === "onboarding" && c.step === s.key && c.completed)
  ).length;

  const rankIdx = RANK_ORDER.indexOf(cadet.rank ?? "");

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#003087]">Cadet Report Card</h1>
          <p className="text-sm text-gray-400">Generated {format(new Date(), "MMMM d, yyyy")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 print:hidden"
          onClick={() => window.print()}
        >
          <Printer className="h-3.5 w-3.5" />
          Print
        </Button>
      </div>

      {/* Identity */}
      <div className="flex items-center gap-4 rounded-2xl border bg-white p-5">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="bg-[#003087] text-white text-lg font-bold">
            {initials(cadet.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-gray-900">{cadet.full_name}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {cadet.rank && <Badge variant="outline" className="font-mono">{cadet.rank}</Badge>}
            {billet && <Badge className="bg-amber-100 text-amber-700 border-amber-200">{billet.name}</Badge>}
          </div>
        </div>
        {rankIdx >= 0 && (
          <div className="hidden sm:block text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Rank Progress</p>
            <p className="text-sm font-bold text-[#003087]">{rankIdx + 1} / {RANK_ORDER.length}</p>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Attendance</p>
          <p className="mt-1 text-3xl font-extrabold text-[#003087]">
            {attPct !== null ? `${attPct}%` : "—"}
          </p>
          <p className="text-xs text-gray-400">{presentAtt}/{totalAtt} drills</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Qualifications</p>
          <p className="mt-1 text-3xl font-extrabold text-[#003087]">{completedQuals}</p>
          <p className="text-xs text-gray-400">of {qualTypes.length} total</p>
        </div>
        <div className={`rounded-xl border p-4 ${openCorrections > 0 ? "bg-red-50" : "bg-white"}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Open Corrections</p>
          <p className={`mt-1 text-3xl font-extrabold ${openCorrections > 0 ? "text-red-600" : "text-[#003087]"}`}>
            {openCorrections}
          </p>
          <p className="text-xs text-gray-400">active write-ups</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Inspection Pass Rate</p>
          <p className="mt-1 text-3xl font-extrabold text-[#003087]">
            {passRate !== null ? `${passRate}%` : "—"}
          </p>
          <p className="text-xs text-gray-400">{inspPasses}/{inspTotal} passed</p>
        </div>
      </div>

      {/* Inspection sparkline */}
      {recentInspections.length > 0 && (
        <div className="rounded-xl border bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-gray-700">Recent Inspections</p>
          <div className="flex items-end gap-2">
            {recentInspections.map((r, i) => {
              const avg = avgScore(r.scores) ?? 0;
              const height = avg > 0 ? Math.round((avg / 4) * 48) : 4;
              const color = r.passed ? "bg-green-500" : "bg-red-400";
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-full rounded-t-sm ${color} transition-all`}
                    style={{ height: `${height}px` }}
                    title={`${avg.toFixed(1)}/4.0 — ${r.passed ? "PASS" : "FAIL"}`}
                  />
                  <p className="text-[10px] text-gray-400 rotate-45 origin-left">
                    {r.uniform_inspection_sessions?.date
                      ? format(new Date(r.uniform_inspection_sessions.date), "M/d")
                      : "—"}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />Pass</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400 inline-block" />Fail</span>
          </div>
        </div>
      )}

      {/* In-processing checklist */}
      <div className="rounded-xl border bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">In-Processing</p>
          <Badge variant="outline" className={onboardingDone === ONBOARDING_STEPS.length ? "border-green-300 text-green-700 bg-green-50" : ""}>
            {onboardingDone}/{ONBOARDING_STEPS.length}
          </Badge>
        </div>
        <div className="space-y-2">
          {ONBOARDING_STEPS.map(({ key, label }) => {
            const done = checklists.some((c) => c.type === "onboarding" && c.step === key && c.completed);
            return (
              <div key={key} className="flex items-center gap-2">
                {done
                  ? <CheckSquare className="h-4 w-4 shrink-0 text-green-600" />
                  : <Square className="h-4 w-4 shrink-0 text-gray-300" />}
                <span className={`text-sm ${done ? "text-gray-400 line-through" : "text-gray-700"}`}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
