"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Lightbulb, ChevronDown, ChevronUp, Clock, Users, MapPin, Wrench, CheckCircle2, Archive, RotateCcw, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitDrillSuggestion, updateSuggestionStatus } from "@/app/(app)/drill-suggestions/actions";
import type { DrillSuggestion } from "@/app/(app)/drill-suggestions/actions";

const CATEGORIES = [
  { value: "pt", label: "Physical Training" },
  { value: "academic", label: "Academic / Classroom" },
  { value: "leadership", label: "Leadership Exercise" },
  { value: "field", label: "Field Exercise" },
  { value: "community", label: "Community Service" },
  { value: "team_building", label: "Team Building" },
  { value: "special_event", label: "Special Event" },
  { value: "drill", label: "Drill / Formation" },
  { value: "other", label: "Other" },
] as const;

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:  { label: "Pending",  color: "text-amber-700 bg-amber-50 border-amber-200" },
  used:     { label: "Used",     color: "text-green-700 bg-green-50 border-green-200" },
  archived: { label: "Archived", color: "text-gray-500 bg-gray-50 border-gray-200" },
};

function SuggestionCard({
  s,
  isStaff,
  onStatusChange,
}: {
  s: DrillSuggestion;
  isStaff: boolean;
  onStatusChange: (id: string, status: DrillSuggestion["status"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const st = STATUS_LABELS[s.status] ?? STATUS_LABELS.pending;

  const changeStatus = async (newStatus: DrillSuggestion["status"]) => {
    setUpdating(true);
    const res = await updateSuggestionStatus(s.id, newStatus);
    if (res?.error) {
      toast.error(res.error);
    } else {
      onStatusChange(s.id, newStatus);
      toast.success(newStatus === "used" ? "Marked as used!" : newStatus === "archived" ? "Archived." : "Restored.");
    }
    setUpdating(false);
  };

  const catLabel = CATEGORIES.find((c) => c.value === s.category)?.label ?? s.category;

  return (
    <div className={`rounded-xl border bg-white shadow-sm overflow-hidden transition-all ${s.status === "archived" ? "opacity-60" : ""}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm">{s.title}</span>
            <span className="text-xs rounded-full border px-2 py-0.5 text-gray-500 border-gray-200 bg-gray-50">{catLabel}</span>
            <span className={`text-xs rounded-full border px-2 py-0.5 font-medium ${st.color}`}>{st.label}</span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500 truncate">{s.description}</p>
        </div>
        <div className="shrink-0 text-gray-400 mt-0.5">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="border-t px-4 py-4 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">{s.description}</p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {s.location && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span>{s.location}</span>
              </div>
            )}
            {s.duration_minutes && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span>{s.duration_minutes >= 60
                  ? `${Math.floor(s.duration_minutes / 60)}h${s.duration_minutes % 60 ? ` ${s.duration_minutes % 60}m` : ""}`
                  : `${s.duration_minutes}m`}</span>
              </div>
            )}
            {(s.min_personnel || s.max_personnel) && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span>
                  {s.min_personnel && s.max_personnel
                    ? `${s.min_personnel}–${s.max_personnel} people`
                    : s.min_personnel
                    ? `${s.min_personnel}+ people`
                    : `Up to ${s.max_personnel} people`}
                </span>
              </div>
            )}
            {s.materials_needed && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Wrench className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{s.materials_needed}</span>
              </div>
            )}
          </div>

          {s.notes && (
            <p className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-3">{s.notes}</p>
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-gray-400">
              Suggested by <strong>{s.suggested_by_name}</strong>
              {s.used_in_pod_date && ` · Used ${s.used_in_pod_date}`}
            </p>
            {isStaff && (
              <div className="flex gap-2">
                {s.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => changeStatus("used")}
                      disabled={updating}
                      className="h-7 gap-1.5 text-xs border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Mark Used
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => changeStatus("archived")}
                      disabled={updating}
                      className="h-7 gap-1.5 text-xs text-gray-500 hover:bg-gray-50"
                    >
                      <Archive className="h-3 w-3" /> Archive
                    </Button>
                  </>
                )}
                {s.status !== "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => changeStatus("pending")}
                    disabled={updating}
                    className="h-7 gap-1.5 text-xs text-gray-500 hover:bg-gray-50"
                  >
                    <RotateCcw className="h-3 w-3" /> Restore
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SuggestionForm({ onSubmitted }: { onSubmitted: (s: DrillSuggestion) => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await submitDrillSuggestion(fd);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Idea submitted! Officers will see it when building the POD.");
      form.reset();
      setOpen(false);
      // Optimistic add — server will have the real row next page load
      onSubmitted({
        id: Math.random().toString(36).slice(2),
        title: String(fd.get("title") ?? ""),
        category: String(fd.get("category") ?? "drill"),
        description: String(fd.get("description") ?? ""),
        location: String(fd.get("location") ?? "") || null,
        duration_minutes: parseInt(String(fd.get("duration_minutes") ?? ""), 10) || null,
        min_personnel: parseInt(String(fd.get("min_personnel") ?? ""), 10) || null,
        max_personnel: parseInt(String(fd.get("max_personnel") ?? ""), 10) || null,
        materials_needed: String(fd.get("materials_needed") ?? "") || null,
        notes: String(fd.get("notes") ?? "") || null,
        suggested_by: null,
        suggested_by_name: "You",
        status: "pending",
        used_in_pod_date: null,
        created_at: new Date().toISOString(),
      });
    }
    setSubmitting(false);
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="gap-2 bg-[#003087] hover:bg-[#002266]">
        <Plus className="h-4 w-4" /> Suggest an Idea
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-white shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-800 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" /> New Drill / Event Idea
        </h2>
        <button type="button" onClick={() => setOpen(false)}>
          <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
        </button>
      </div>

      {/* Row 1: title + category */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Name / Title <span className="text-red-500">*</span></label>
          <input
            name="title"
            required
            maxLength={150}
            placeholder="e.g. Land Navigation Course"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#003087] focus:outline-none focus:ring-1 focus:ring-[#003087]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Category</label>
          <select
            name="category"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#003087] focus:outline-none focus:ring-1 focus:ring-[#003087]"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">
          What&apos;s Involved <span className="text-red-500">*</span>
        </label>
        <textarea
          name="description"
          required
          maxLength={1000}
          rows={3}
          placeholder="Describe the activity — what cadets would do, how it runs, what skills it builds…"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#003087] focus:outline-none focus:ring-1 focus:ring-[#003087] resize-none"
        />
      </div>

      {/* Row 2: location + duration */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Location</label>
          <input
            name="location"
            maxLength={200}
            placeholder="e.g. Parade field, Gym, Classroom 3"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#003087] focus:outline-none focus:ring-1 focus:ring-[#003087]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Estimated Duration (minutes)</label>
          <input
            name="duration_minutes"
            type="number"
            min={1}
            max={720}
            placeholder="e.g. 90"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#003087] focus:outline-none focus:ring-1 focus:ring-[#003087]"
          />
        </div>
      </div>

      {/* Row 3: personnel */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Minimum People</label>
          <input
            name="min_personnel"
            type="number"
            min={1}
            placeholder="e.g. 10"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#003087] focus:outline-none focus:ring-1 focus:ring-[#003087]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Maximum People</label>
          <input
            name="max_personnel"
            type="number"
            min={1}
            placeholder="e.g. 40"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#003087] focus:outline-none focus:ring-1 focus:ring-[#003087]"
          />
        </div>
      </div>

      {/* Equipment */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">Equipment / Materials Needed</label>
        <textarea
          name="materials_needed"
          maxLength={500}
          rows={2}
          placeholder="e.g. Compasses, maps, blindfolds…"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#003087] focus:outline-none focus:ring-1 focus:ring-[#003087] resize-none"
        />
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">Anything Else?</label>
        <textarea
          name="notes"
          maxLength={500}
          rows={2}
          placeholder="Special considerations, cadet prerequisites, best season, etc."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#003087] focus:outline-none focus:ring-1 focus:ring-[#003087] resize-none"
        />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting} className="bg-[#003087] hover:bg-[#002266]">
          {submitting ? "Submitting…" : "Submit Idea"}
        </Button>
      </div>
    </form>
  );
}

type FilterTab = "pending" | "used" | "archived" | "all";

export function DrillSuggestionsClient({
  initialSuggestions,
  isStaff,
  myProfileId,
}: {
  initialSuggestions: DrillSuggestion[];
  isStaff: boolean;
  myProfileId: string;
}) {
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [filter, setFilter] = useState<FilterTab>("pending");

  const handleAdd = (s: DrillSuggestion) => setSuggestions((prev) => [s, ...prev]);
  const handleStatusChange = (id: string, status: DrillSuggestion["status"]) =>
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "pending",  label: `Pending (${suggestions.filter((s) => s.status === "pending").length})` },
    { key: "used",     label: "Used" },
    { key: "archived", label: "Archived" },
    { key: "all",      label: "All" },
  ];

  const visible = suggestions.filter((s) => {
    if (filter === "all") return true;
    return s.status === filter;
  });

  return (
    <div className="space-y-4">
      <SuggestionForm onSubmitted={handleAdd} />

      {/* Filter tabs — only show to staff */}
      {isStaff && (
        <div className="flex gap-1 rounded-lg border bg-gray-50 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                filter === t.key
                  ? "bg-white shadow text-[#003087] font-semibold"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-gray-50 py-12 text-center">
          <Lightbulb className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">
            {filter === "pending" ? "No pending ideas yet." : "Nothing here."}
          </p>
          <p className="text-xs text-gray-400">Be the first — click &ldquo;Suggest an Idea&rdquo; above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((s) => (
            <SuggestionCard
              key={s.id}
              s={s}
              isStaff={isStaff || s.suggested_by === myProfileId}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
