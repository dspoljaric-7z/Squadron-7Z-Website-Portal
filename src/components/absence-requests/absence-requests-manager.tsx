"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CalendarOff, Check, X, Clock } from "lucide-react";
import { HintButton } from "@/components/shared/hint-button";

const ABSENCE_HINTS = [
  { heading: "Reviewing requests", body: "Use the Pending tab to see open requests. Click Approve or Deny on each one. Add a note in the review notes field before deciding — it's visible to the cadet." },
  { heading: "Auto-excused drill", body: "Approving an absence request automatically marks the cadet as Excused in the drill attendance record for that date, if a session exists." },
  { heading: "Decided requests", body: "The Decided tab shows all approved and denied requests. You can re-review a decided request if circumstances change." },
  { heading: "Who submits requests", body: "Cadets submit absence requests from their own portal. Staff with absence-review access (MAA, division leaders, officers) can review them here." },
];
import { format } from "date-fns";
import { toast } from "sonner";
import type { Profile } from "@/types/database";

type AbsenceRequest = {
  id: string;
  cadet_id: string;
  requested_date: string;
  request_type: "absence" | "early_leave" | "late_arrival" | null;
  source: "sq7z" | "tsw" | null;
  reason: string;
  makeup_plan: string | null;
  departure_time: string | null;
  status: "pending" | "approved" | "denied";
  review_notes: string | null;
  created_at: string;
  cadet: { full_name: string; rank: string | null } | null;
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  absence: "Full Absence",
  early_leave: "Early Dismissal",
  late_arrival: "Late Arrival",
};

const REQUEST_TYPE_COLORS: Record<string, string> = {
  absence: "bg-red-50 text-red-700 border-red-200",
  early_leave: "bg-amber-50 text-amber-700 border-amber-200",
  late_arrival: "bg-blue-50 text-blue-700 border-blue-200",
};

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  denied: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_ICONS = {
  pending: <Clock className="h-3 w-3" />,
  approved: <Check className="h-3 w-3" />,
  denied: <X className="h-3 w-3" />,
};

export function AbsenceRequestsManager({
  initialRequests,
  profile,
}: {
  initialRequests: AbsenceRequest[];
  profile: Profile;
}) {
  // NCOs can view requests but only officers/SNCOs may approve or deny
  const canApprove = profile.role === "officer" || profile.role === "snco";
  const [requests, setRequests] = useState(initialRequests);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "pending" | "decided">("pending");
  const [unitFilter, setUnitFilter] = useState<"all" | "sq7z" | "tsw">("all");

  const hasBothUnits = requests.some((r) => r.source === "tsw") && requests.some((r) => r.source !== "tsw");

  const review = async (id: string, status: "approved" | "denied") => {
    const supabase = createClient();
    const notes = reviewNotes[id] ?? "";
    const req = requests.find((r) => r.id === id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("absence_requests")
      .update({
        status,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null,
      })
      .eq("id", id);

    if (error) { toast.error(error.message); return; }

    // Only auto-excuse drill attendance for SQ7Z requests (TSW has no drill_attendance table)
    if (status === "approved" && req && req.source !== "tsw") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: session } = await (supabase as any)
        .from("drill_sessions")
        .select("id")
        .eq("date", req.requested_date)
        .maybeSingle();
      if (session) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("drill_attendance")
          .upsert(
            { session_id: session.id, cadet_id: req.cadet_id, status: "excused", note: "Approved absence request" },
            { onConflict: "session_id,cadet_id" }
          );
      }
    }

    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status, review_notes: notes || null } : r));
    toast.success(`Request ${status}`);
  };

  const unitFiltered = unitFilter === "all" ? requests : unitFilter === "tsw"
    ? requests.filter((r) => r.source === "tsw")
    : requests.filter((r) => r.source !== "tsw");
  const pending = unitFiltered.filter((r) => r.status === "pending");
  const decided = unitFiltered.filter((r) => r.status !== "pending");
  const displayed = filter === "all" ? unitFiltered : filter === "pending" ? pending : decided;

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center text-gray-400">
        <CalendarOff className="h-8 w-8 opacity-30" />
        <p className="text-sm font-medium">No absence requests</p>
        <p className="text-xs">Requests submitted by cadets will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <CalendarOff className="h-5 w-5 text-[#003087]" />
        <h1 className="text-xl font-bold text-gray-900">Absence Requests</h1>
        <HintButton title="Absence Requests" hints={ABSENCE_HINTS} />
      </div>
      {/* Status filter tabs */}
      <div className="flex gap-1 rounded-lg border bg-white p-1 w-fit">
        {([
          { key: "pending", label: `Pending (${pending.length})` },
          { key: "decided", label: `Decided (${decided.length})` },
          { key: "all", label: `All (${unitFiltered.length})` },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === key
                ? "bg-[#003087] text-white"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Unit filter — only shown when both SQ7Z and TSW requests exist */}
      {hasBothUnits && (
        <div className="flex gap-1 rounded-lg border bg-white p-1 w-fit">
          {([
            { key: "all", label: "All Units" },
            { key: "sq7z", label: "SQ7Z" },
            { key: "tsw", label: "TSW" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setUnitFilter(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                unitFilter === key
                  ? "bg-gray-700 text-white"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Request cards */}
      <div className="space-y-3">
        {displayed.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-400">
            No {filter} requests.
          </div>
        )}
        {displayed.map((r) => (
          <div key={r.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">
                  {r.cadet?.rank ? `${r.cadet.rank} ` : ""}{r.cadet?.full_name ?? "Unknown"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {format(new Date(r.requested_date + "T12:00:00"), "EEEE, MMMM d, yyyy")}
                  {r.request_type === "early_leave" && r.departure_time && (
                    <span className="ml-1.5 text-amber-600 font-medium">· departs {r.departure_time}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {hasBothUnits && r.source && (
                  <Badge className="text-[10px] border bg-gray-100 text-gray-500 border-gray-200">
                    {r.source.toUpperCase()}
                  </Badge>
                )}
                {r.request_type && (
                  <Badge className={`text-[10px] border ${REQUEST_TYPE_COLORS[r.request_type] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                    {REQUEST_TYPE_LABELS[r.request_type] ?? r.request_type}
                  </Badge>
                )}
                <Badge className={`flex items-center gap-1 ${STATUS_COLORS[r.status]}`}>
                  {STATUS_ICONS[r.status]}
                  {r.status}
                </Badge>
              </div>
            </div>

            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{r.reason}</p>

            {r.makeup_plan && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-0.5">Makeup Plan</p>
                <p className="text-sm text-blue-800">{r.makeup_plan}</p>
              </div>
            )}

            {r.review_notes && r.status !== "pending" && (
              <p className="text-xs text-gray-500 italic">Staff note: {r.review_notes}</p>
            )}

            {r.status === "pending" && canApprove && (
              <div className="flex items-center gap-2 pt-1">
                <Input
                  value={reviewNotes[r.id] ?? ""}
                  onChange={(e) => setReviewNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  placeholder="Optional review notes…"
                  className="h-8 text-sm flex-1"
                />
                <Button
                  size="sm"
                  className="h-8 bg-green-600 hover:bg-green-700 text-white gap-1.5 shrink-0"
                  onClick={() => review(r.id, "approved")}
                >
                  <Check className="h-3.5 w-3.5" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-red-200 text-red-600 hover:bg-red-50 gap-1.5 shrink-0"
                  onClick={() => review(r.id, "denied")}
                >
                  <X className="h-3.5 w-3.5" /> Deny
                </Button>
              </div>
            )}
            {r.status === "pending" && !canApprove && (
              <p className="text-xs text-gray-400 italic pt-1">Officers and SNCOs can approve or deny requests.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
