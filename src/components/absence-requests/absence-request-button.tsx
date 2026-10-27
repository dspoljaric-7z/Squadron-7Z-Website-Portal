"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarOff, Calendar, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import type { Profile } from "@/types/database";

type DrillOption = { id: string; date: string; location: string | null };

type RequestType = "absence" | "early_leave" | "late_arrival";

const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  absence: "Full Absence",
  early_leave: "Early Dismissal",
  late_arrival: "Late Arrival",
};

export function AbsenceRequestButton({
  profile,
  defaultType = "absence",
  buttonLabel,
  buttonVariant = "outline",
  drillSource = "sq7z",
}: {
  profile: Profile;
  defaultType?: RequestType;
  buttonLabel?: string;
  buttonVariant?: "outline" | "default" | "ghost";
  drillSource?: "sq7z" | "tsw";
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [upcomingDrills, setUpcomingDrills] = useState<DrillOption[]>([]);
  const [loadingDrills, setLoadingDrills] = useState(false);
  const [form, setForm] = useState({
    drill_session_id: "",
    custom_date: "",
    request_type: defaultType as RequestType,
    reason: "",
    makeup_plan: "",
    departure_time: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const selectedDrill = upcomingDrills.find((d) => d.id === form.drill_session_id);
  const effectiveDate = selectedDrill?.date ?? form.custom_date;

  const loadDrills = async () => {
    setLoadingDrills(true);
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    let drills: DrillOption[] = [];
    if (drillSource === "tsw") {
      // TSW meeting sessions — stored without a location field
      const { data } = await supabase
        .from("tsw_meeting_sessions" as never)
        .select("id, date")
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(12);
      drills = ((data ?? []) as { id: string; date: string }[]).map((d) => ({ id: d.id, date: d.date, location: null }));
    } else {
      const { data } = await supabase
        .from("drill_sessions")
        .select("id, date, location")
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(12);
      drills = (data ?? []) as DrillOption[];
    }

    setUpcomingDrills(drills);
    if (drills.length > 0 && !form.drill_session_id) {
      set("drill_session_id", drills[0].id);
    }
    setLoadingDrills(false);
  };

  useEffect(() => {
    if (open) loadDrills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset form on close
  const handleClose = () => {
    setOpen(false);
    setForm({ drill_session_id: "", custom_date: "", request_type: defaultType, reason: "", makeup_plan: "", departure_time: "" });
  };

  const submit = async () => {
    if (!effectiveDate || !form.reason.trim()) return;
    setSaving(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("absence_requests").insert({
      cadet_id: profile.id,
      requested_date: effectiveDate,
      // Only store drill_session_id for SQ7Z — TSW IDs come from tsw_meeting_sessions and would violate the FK
      drill_session_id: drillSource === "sq7z" ? (form.drill_session_id || null) : null,
      request_type: form.request_type,
      source: drillSource,
      reason: form.reason.trim(),
      makeup_plan: form.makeup_plan.trim() || null,
      departure_time: form.request_type === "early_leave" ? (form.departure_time || null) : null,
    });
    setSaving(false);
    if (error) {
      // Fallback: columns may not exist yet — submit with just the base fields
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: e2 } = await (supabase as any).from("absence_requests").insert({
        cadet_id: profile.id,
        requested_date: effectiveDate,
        source: drillSource,
        reason: `[${REQUEST_TYPE_LABELS[form.request_type]}${form.request_type === "early_leave" && form.departure_time ? ` — ${form.departure_time}` : ""}] ${form.reason.trim()}${form.makeup_plan.trim() ? `\n\nMakeup plan: ${form.makeup_plan.trim()}` : ""}`,
      });
      if (e2) { toast.error(e2.message); return; }
    }
    toast.success("Request submitted — your staff will review it.");
    handleClose();
  };

  const label = buttonLabel ?? (defaultType === "early_leave" ? "Early Dismissal" : defaultType === "late_arrival" ? "Late Arrival" : "Request Absence");
  const Icon = defaultType === "early_leave" ? CalendarOff : defaultType === "late_arrival" ? Calendar : CalendarOff;

  return (
    <>
      <Button variant={buttonVariant} size="sm" onClick={() => setOpen(true)} className="flex items-center gap-1.5">
        <Icon className="h-4 w-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Leave from Drill</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Request type */}
            <div className="space-y-1.5">
              <Label>Request Type</Label>
              <div className="flex gap-2">
                {(["absence", "early_leave", "late_arrival"] as RequestType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => set("request_type", t)}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${form.request_type === t ? "border-[#003087] bg-[#003087] text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}
                  >
                    {REQUEST_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Drill picker */}
            <div className="space-y-1.5">
              <Label>Drill Date *</Label>
              {loadingDrills ? (
                <div className="h-9 rounded-md border border-gray-200 bg-gray-50 animate-pulse" />
              ) : upcomingDrills.length > 0 ? (
                <>
                  <div className="relative">
                    <select
                      value={form.drill_session_id}
                      onChange={(e) => set("drill_session_id", e.target.value)}
                      className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 pr-8 text-sm text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
                    >
                      <option value="">— pick a drill —</option>
                      {upcomingDrills.map((d) => (
                        <option key={d.id} value={d.id}>
                          {format(parseISO(d.date), "EEE, MMM d yyyy")}{d.location ? ` · ${d.location}` : ""}
                        </option>
                      ))}
                      <option value="__custom">Other date…</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                  {form.drill_session_id === "__custom" && (
                    <Input
                      type="date"
                      value={form.custom_date}
                      onChange={(e) => set("custom_date", e.target.value)}
                      className="mt-1.5"
                    />
                  )}
                </>
              ) : (
                <Input
                  type="date"
                  value={form.custom_date}
                  onChange={(e) => set("custom_date", e.target.value)}
                />
              )}
            </div>

            {/* Departure time for early leave */}
            {form.request_type === "early_leave" && (
              <div className="space-y-1.5">
                <Label>Departure Time</Label>
                <Input
                  type="time"
                  value={form.departure_time}
                  onChange={(e) => set("departure_time", e.target.value)}
                />
                <p className="text-xs text-gray-400">What time do you need to leave?</p>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-1.5">
              <Label>Reason *</Label>
              <Textarea
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
                placeholder="Briefly explain why you will be absent / leaving early…"
                rows={3}
              />
            </div>

            {/* Makeup plan */}
            <div className="space-y-1.5">
              <Label>
                Makeup Plan <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Textarea
                value={form.makeup_plan}
                onChange={(e) => set("makeup_plan", e.target.value)}
                placeholder="How will you make up what you missed? (e.g. review the POD, practice drill on your own, extra uniform inspection…)"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              disabled={saving || !effectiveDate || !form.reason.trim()}
              onClick={submit}
              className="bg-[#003087] hover:bg-[#002266]"
            >
              {saving ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
