"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Clock, CheckCircle2, XCircle, AlertCircle, Plus, ChevronDown, ChevronUp } from "lucide-react";
import type { Profile } from "@/types/database";

type SessionSnippet = { id: string; date: string; location: string | null };
type RequestRow = {
  id: string;
  cadet_id: string;
  session_id: string;
  reason: string | null;
  departure_time: string | null;
  status: string;
  reviewer_notes: string | null;
  created_at: string;
  cadet?: { id: string; full_name: string; rank: string | null } | null;
  session?: { date: string; location: string | null } | null;
};

const STATUS_CONFIG = {
  pending:  { label: "Pending",  icon: AlertCircle,  cls: "border-amber-200 bg-amber-50 text-amber-700" },
  approved: { label: "Approved", icon: CheckCircle2, cls: "border-green-200 bg-green-50 text-green-700" },
  denied:   { label: "Denied",   icon: XCircle,      cls: "border-red-200 bg-red-50 text-red-700" },
};

export function EarlyDepartureManager({
  profile,
  sessions,
  initialRequests,
  isStaff,
}: {
  profile: Profile;
  sessions: SessionSnippet[];
  initialRequests: RequestRow[];
  isStaff: boolean;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ session_id: sessions[0]?.id ?? "", departure_time: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createClient() as any;

  const submitRequest = async () => {
    if (!form.session_id) { toast.error("Select a drill session"); return; }
    if (!form.departure_time) { toast.error("Enter your planned departure time"); return; }
    setSubmitting(true);
    const { data, error } = await sb.from("early_departure_requests").insert({
      cadet_id: profile.id,
      session_id: form.session_id,
      reason: form.reason || null,
      departure_time: form.departure_time,
      status: "pending",
    }).select("*, session:drill_sessions!early_departure_requests_session_id_fkey(date, location)").single();
    setSubmitting(false);
    if (error) { toast.error("Failed to submit request"); return; }
    toast.success("Request submitted");
    setRequests((prev) => [data, ...prev]);
    setShowForm(false);
    setForm({ session_id: sessions[0]?.id ?? "", departure_time: "", reason: "" });
  };

  const reviewRequest = async (id: string, status: "approved" | "denied") => {
    const { data, error } = await sb
      .from("early_departure_requests")
      .update({ status, reviewed_by: profile.id, reviewed_at: new Date().toISOString(), reviewer_notes: reviewNotes || null })
      .eq("id", id)
      .select("*, cadet:profiles!early_departure_requests_cadet_id_fkey(id, full_name, rank), session:drill_sessions!early_departure_requests_session_id_fkey(date, location)")
      .single();
    if (error) { toast.error("Failed to update"); return; }
    toast.success(`Request ${status}`);
    setRequests((prev) => prev.map((r) => r.id === id ? data : r));
    setReviewingId(null);
    setReviewNotes("");
  };

  const pending = requests.filter((r) => r.status === "pending");
  const reviewed = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-4">
      {/* Submit form — cadets only */}
      {!isStaff && (
        <div className="rounded-xl border bg-white shadow-sm">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#003087]" />
              <span className="text-sm font-semibold text-gray-800">Request Early Departure</span>
            </div>
            {showForm ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>
          {showForm && (
            <div className="border-t px-4 py-3 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Drill Session</label>
                <select
                  value={form.session_id}
                  onChange={(e) => setForm((f) => ({ ...f, session_id: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#003087] focus:outline-none"
                >
                  <option value="">Select a session…</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {format(new Date(s.date + "T00:00:00"), "EEEE, MMM d, yyyy")}
                      {s.location ? ` — ${s.location}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Planned Departure Time <span className="text-red-400">*</span>
                </label>
                <input
                  type="time"
                  value={form.departure_time}
                  onChange={(e) => setForm((f) => ({ ...f, departure_time: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#003087] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Reason</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Briefly explain why you need to leave early…"
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#003087] focus:outline-none resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={submitRequest}
                  disabled={submitting}
                  className="bg-[#003087] hover:bg-[#003087]/80 text-white"
                >
                  {submitting ? "Submitting…" : "Submit Request"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold text-gray-800">
              Pending <Badge variant="outline" className="ml-1 text-amber-700 border-amber-300">{pending.length}</Badge>
            </h2>
          </div>
          <div className="divide-y">
            {pending.map((req) => (
              <div key={req.id} className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {isStaff && req.cadet && (
                      <p className="font-semibold text-gray-900">
                        {req.cadet.rank ? `${req.cadet.rank} ` : ""}{req.cadet.full_name}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      {req.session ? format(new Date(req.session.date + "T00:00:00"), "EEE MMM d") : "—"}
                      {req.departure_time && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[#003087]">
                          <Clock className="h-3 w-3" /> Leaving at {req.departure_time}
                        </span>
                      )}
                    </p>
                    {req.reason && <p className="text-xs text-gray-500 mt-0.5">{req.reason}</p>}
                  </div>
                  <Badge variant="outline" className="shrink-0 border-amber-200 text-amber-700">Pending</Badge>
                </div>

                {/* Staff review actions */}
                {isStaff && (
                  <div>
                    {reviewingId === req.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Optional notes for the cadet…"
                          rows={2}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-[#003087] focus:outline-none resize-none"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => reviewRequest(req.id, "approved")} className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs">
                            Approve
                          </Button>
                          <Button size="sm" onClick={() => reviewRequest(req.id, "denied")} className="bg-red-600 hover:bg-red-700 text-white h-7 text-xs">
                            Deny
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setReviewingId(null)} className="h-7 text-xs">Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setReviewingId(req.id); setReviewNotes(""); }}
                        className="h-7 text-xs"
                      >
                        Review
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviewed requests */}
      {reviewed.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold text-gray-800">Past Requests</h2>
          </div>
          <div className="divide-y">
            {reviewed.map((req) => {
              const cfg = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <div key={req.id} className="flex items-start gap-3 px-4 py-3">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${req.status === "approved" ? "text-green-600" : req.status === "denied" ? "text-red-500" : "text-amber-500"}`} />
                  <div className="flex-1 min-w-0">
                    {isStaff && req.cadet && (
                      <p className="text-sm font-semibold text-gray-800">
                        {req.cadet.rank ? `${req.cadet.rank} ` : ""}{req.cadet.full_name}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      {req.session ? format(new Date(req.session.date + "T00:00:00"), "EEE MMM d") : "—"}
                      {req.departure_time && ` · leaving at ${req.departure_time}`}
                    </p>
                    {req.reviewer_notes && <p className="text-xs text-gray-500 mt-0.5">Note: {req.reviewer_notes}</p>}
                  </div>
                  <Badge variant="outline" className={`shrink-0 ${cfg.cls}`}>{cfg.label}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {requests.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-gray-400">
          {isStaff ? "No early departure requests yet." : "No requests submitted yet."}
        </div>
      )}
    </div>
  );
}
