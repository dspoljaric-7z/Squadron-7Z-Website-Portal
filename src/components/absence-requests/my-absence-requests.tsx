"use client";

import { Badge } from "@/components/ui/badge";
import { CalendarOff, Check, X, Clock } from "lucide-react";
import { format } from "date-fns";

type MyAbsenceRequest = {
  id: string;
  requested_date: string;
  request_type: "absence" | "early_leave" | "late_arrival" | null;
  reason: string;
  makeup_plan: string | null;
  departure_time: string | null;
  status: "pending" | "approved" | "denied";
  review_notes: string | null;
  created_at: string;
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

export function MyAbsenceRequests({ requests }: { requests: MyAbsenceRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-gray-400">
        <CalendarOff className="h-4 w-4 shrink-0" />
        No absence requests submitted yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {requests.map((r) => (
        <div key={r.id} className="rounded-xl border bg-white p-4 space-y-2 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {format(new Date(r.requested_date + "T12:00:00"), "EEEE, MMMM d, yyyy")}
              </p>
              {r.request_type === "early_leave" && r.departure_time && (
                <p className="text-xs text-amber-600 font-medium mt-0.5">Departs at {r.departure_time}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {r.request_type && (
                <Badge className={`text-[10px] border ${REQUEST_TYPE_COLORS[r.request_type] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {REQUEST_TYPE_LABELS[r.request_type] ?? r.request_type}
                </Badge>
              )}
              <Badge className={`flex items-center gap-1 text-[10px] border ${STATUS_COLORS[r.status]}`}>
                {STATUS_ICONS[r.status]}
                {r.status}
              </Badge>
            </div>
          </div>

          <p className="text-sm text-gray-600">{r.reason}</p>

          {r.makeup_plan && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-0.5">Makeup Plan</p>
              <p className="text-xs text-blue-800">{r.makeup_plan}</p>
            </div>
          )}

          {r.review_notes && (
            <p className="text-xs text-gray-500 italic border-t pt-2">
              Staff note: {r.review_notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
