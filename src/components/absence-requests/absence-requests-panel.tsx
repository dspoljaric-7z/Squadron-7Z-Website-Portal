"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CalendarOff, Check, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Profile } from "@/types/database";

type AbsenceRequest = {
  id: string;
  cadet_id: string;
  requested_date: string;
  request_type: "absence" | "early_leave" | "late_arrival" | null;
  reason: string;
  makeup_plan: string | null;
  departure_time: string | null;
  status: "pending" | "approved" | "denied";
  review_notes: string | null;
  created_at: string;
  cadet: { full_name: string; rank: string | null } | null;
};

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  denied: "bg-red-100 text-red-700",
};

export function AbsenceRequestsPanel({
  initialRequests,
  profile,
  sessionId,
}: {
  initialRequests: AbsenceRequest[];
  profile: Profile;
  sessionId?: string;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

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

    // Sync to drill attendance if we have a session context
    if (sessionId && req) {
      const attendanceStatus = status === "approved" ? "excused" : "absent";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("drill_attendance")
        .upsert({
          session_id: sessionId,
          cadet_id: req.cadet_id,
          status: attendanceStatus,
          recorded_by: profile.id,
          recorded_at: new Date().toISOString(),
        }, { onConflict: "session_id,cadet_id" });
    }

    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status, review_notes: notes || null } : r));
    toast.success(`Request ${status}${sessionId ? ` — drill attendance updated` : ""}`);
  };

  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending");

  if (requests.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-gray-400">
        <CalendarOff className="h-4 w-4" />
        No absence requests
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {pending.map((r) => (
        <div key={r.id} className="rounded-lg border bg-white p-3 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                {r.cadet?.rank ? `${r.cadet.rank} ` : ""}{r.cadet?.full_name ?? "Unknown"}
              </p>
              <p className="text-xs text-gray-500">
                {format(new Date(r.requested_date + "T12:00:00"), "EEEE, MMMM d, yyyy")}
              </p>
              <p className="mt-1 text-sm text-gray-700">{r.reason}</p>
              {r.request_type === "early_leave" && r.departure_time && (
                <p className="text-xs text-amber-600 font-medium mt-0.5">Departs at {r.departure_time}</p>
              )}
              {r.makeup_plan && (
                <p className="text-xs text-blue-600 mt-0.5">Makeup: {r.makeup_plan}</p>
              )}
            </div>
            <Badge className={STATUS_COLORS[r.status]}>{r.status}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={reviewNotes[r.id] ?? ""}
              onChange={(e) => setReviewNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
              placeholder="Optional notes…"
              className="h-7 text-xs"
            />
            <Button
              size="sm"
              className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white shrink-0"
              onClick={() => review(r.id, "approved")}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 shrink-0"
              onClick={() => review(r.id, "denied")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}

      {decided.length > 0 && (
        <div className="mt-2">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Decided</p>
          {decided.slice(0, 5).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded border bg-gray-50 px-3 py-2 text-sm">
              <span className="text-gray-600">
                {r.cadet?.full_name} · {format(new Date(r.requested_date + "T12:00:00"), "MMM d")}
              </span>
              <Badge className={STATUS_COLORS[r.status]}>{r.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
