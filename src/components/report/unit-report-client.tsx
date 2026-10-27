"use client";

import { format } from "date-fns";
import { Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type Event = {
  id: string;
  title: string;
  start_time: string;
  event_type: string;
  rsvp_required?: boolean;
};

type Correction = { id: string; tier: number; cadet_id: string; issued_at: string };
type Pip = { id: string; cadet_id: string };
type Pipeline = { id: string; billet_name: string; stage: string };

export function UnitReportClient({
  generatedAt,
  totalMembers,
  attendanceRate30d,
  attendanceSessions,
  openCorrectionsCount,
  openPipsCount,
  activePipelinesCount,
  billetsFilled,
  upcomingEvents,
  expiredDocsCount,
  openCorrections,
  activePipelines,
}: {
  generatedAt: string;
  totalMembers: number;
  attendanceRate30d: number | null;
  attendanceSessions: number;
  openCorrectionsCount: number;
  openPipsCount: number;
  activePipelinesCount: number;
  billetsFilled: number;
  upcomingEvents: Event[];
  expiredDocsCount: number;
  openCorrections: Correction[];
  openPips?: Pip[];
  activePipelines: Pipeline[];
}) {
  const handlePrint = () => window.print();

  const handleExport = () => {
    const lines = [
      `SQ7 PORTAL — UNIT SUMMARY REPORT`,
      `Generated: ${format(new Date(generatedAt), "MMMM d, yyyy 'at' HH:mm")}`,
      ``,
      `UNIT STRENGTH`,
      `  Active Members: ${totalMembers}`,
      `  Billets Filled: ${billetsFilled}`,
      ``,
      `ATTENDANCE (Last 30 Days)`,
      `  Rate: ${attendanceRate30d !== null ? attendanceRate30d + "%" : "N/A"}`,
      `  Sessions: ${attendanceSessions}`,
      ``,
      `OPEN ISSUES`,
      `  Corrections: ${openCorrectionsCount}`,
      `  PIPs: ${openPipsCount}`,
      `  Expired Documents: ${expiredDocsCount}`,
      ``,
      `NOMINATIONS IN PIPELINE`,
      `  Count: ${activePipelinesCount}`,
      ...activePipelines.map((p) => `  - ${p.billet_name} (${p.stage})`),
      ``,
      `UPCOMING EVENTS`,
      ...upcomingEvents.map((e) => `  - ${e.title} on ${format(new Date(e.start_time), "MMM d, yyyy 'at' HH:mm")}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unit-report-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#003087] print:text-xl">Unit Summary Report</h1>
          <p className="text-sm text-gray-500">
            Generated {format(new Date(generatedAt), "MMMM d, yyyy 'at' HH:mm")}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">For official use only — CO briefings and inspections</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
        <StatCard label="Active Members" value={totalMembers} sub="approved & active" color="blue" />
        <StatCard
          label="Attendance (30d)"
          value={attendanceRate30d !== null ? `${attendanceRate30d}%` : "—"}
          sub={`${attendanceSessions} session${attendanceSessions !== 1 ? "s" : ""}`}
          color={attendanceRate30d !== null && attendanceRate30d < 75 ? "red" : "green"}
        />
        <StatCard
          label="Open Issues"
          value={openCorrectionsCount + openPipsCount}
          sub={`${openCorrectionsCount} corrections, ${openPipsCount} PIPs`}
          color={openCorrectionsCount + openPipsCount > 0 ? "amber" : "green"}
        />
        <StatCard
          label="Expired Docs"
          value={expiredDocsCount}
          sub="need renewal"
          color={expiredDocsCount > 0 ? "amber" : "green"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Nominations Pipeline */}
        <ReportSection title="Nominations in Pipeline" count={activePipelinesCount}>
          {activePipelines.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No active nominations.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left py-1.5">Billet</th>
                  <th className="text-left py-1.5">Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activePipelines.map((p) => (
                  <tr key={p.id}>
                    <td className="py-1.5 font-medium">{p.billet_name}</td>
                    <td className="py-1.5 capitalize text-gray-600">{p.stage.replace(/_/g, " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ReportSection>

        {/* Open Corrections Summary */}
        <ReportSection title="Open Corrections" count={openCorrectionsCount}>
          {openCorrections.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No open corrections.</p>
          ) : (
            <div className="space-y-1">
              {[1, 2, 3, 4].map((tier) => {
                const count = openCorrections.filter((c) => c.tier === tier).length;
                return count > 0 ? (
                  <div key={tier} className="flex justify-between text-sm">
                    <span className="text-gray-600">Tier {tier}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </ReportSection>
      </div>

      {/* Upcoming Events */}
      <ReportSection title="Upcoming Events" count={upcomingEvents.length}>
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No upcoming events.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left py-1.5">Event</th>
                <th className="text-left py-1.5">Date</th>
                <th className="text-left py-1.5">Type</th>
                <th className="text-left py-1.5">RSVP</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {upcomingEvents.map((e) => (
                <tr key={e.id}>
                  <td className="py-1.5 font-medium">{e.title}</td>
                  <td className="py-1.5 text-gray-600">{format(new Date(e.start_time), "MMM d, yyyy")}</td>
                  <td className="py-1.5 capitalize text-gray-600">{e.event_type.replace("_", " ")}</td>
                  <td className="py-1.5 text-gray-600">{e.rsvp_required ? "Required" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ReportSection>

      <p className="text-xs text-gray-300 print:text-black print:text-[10px]">
        SQ7 Portal — Confidential Unit Report — {format(new Date(generatedAt), "yyyy-MM-dd")}
      </p>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub: string;
  color: "blue" | "green" | "red" | "amber";
}) {
  const colorMap = {
    blue: "bg-[#003087] text-white",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${colorMap[color]}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${color === "blue" ? "text-white/50" : "opacity-60"}`}>{label}</p>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
      <p className={`mt-0.5 text-xs ${color === "blue" ? "text-white/40" : "opacity-60"}`}>{sub}</p>
    </div>
  );
}

function ReportSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold text-gray-800">{title}</h2>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">{count}</span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}
