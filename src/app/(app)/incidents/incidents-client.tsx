"use client";

import { useState } from "react";
import { AlertTriangle, Plus, X, CheckCircle, Clock, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { createIncidentReport, closeIncidentReport, reopenIncidentReport, updateIncidentReport, type IncidentReport } from "./actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const TYPE_LABELS: Record<IncidentReport["incident_type"], string> = {
  injury: "Injury",
  medical: "Medical Event",
  behavioral: "Behavioral",
  property: "Property",
  other: "Other",
};

const TYPE_COLORS: Record<IncidentReport["incident_type"], string> = {
  injury: "bg-red-500/15 text-red-400 border-red-500/20",
  medical: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  behavioral: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  property: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  other: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

const EMPTY_FORM = {
  incident_date: new Date().toISOString().split("T")[0],
  incident_time: "",
  location: "Drill — NOSC Quincy",
  incident_type: "other" as IncidentReport["incident_type"],
  description: "",
  cadets_involved: [] as string[],
  witnesses: "",
  follow_up_action: "",
  status: "open" as const,
};

export function IncidentsClient({ initialReports }: { initialReports: IncidentReport[] }) {
  const [reports, setReports] = useState(initialReports);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [cadetsInput, setCadetsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<IncidentReport>>({});
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");

  const filtered = reports.filter((r) => statusFilter === "all" || r.status === statusFilter);
  const openCount = reports.filter((r) => r.status === "open").length;

  async function handleCreate() {
    setSaving(true);
    const cadets = cadetsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const result = await createIncidentReport({ ...form, cadets_involved: cadets });
    setSaving(false);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success("Incident report filed.");
    setShowForm(false);
    setForm(EMPTY_FORM);
    setCadetsInput("");
    // Optimistically add (will be replaced on next server render)
    const newReport: IncidentReport = {
      id: crypto.randomUUID(),
      reported_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...form,
      cadets_involved: cadets,
    };
    setReports((prev) => [newReport, ...prev]);
  }

  async function handleClose(id: string) {
    const result = await closeIncidentReport(id);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success("Report closed.");
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: "closed" } : r));
  }

  async function handleReopen(id: string) {
    const result = await reopenIncidentReport(id);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success("Report reopened.");
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: "open" } : r));
  }

  async function handleUpdate(id: string) {
    setSaving(true);
    const result = await updateIncidentReport(id, editForm);
    setSaving(false);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success("Report updated.");
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, ...editForm, updated_at: new Date().toISOString() } : r));
    setEditingId(null);
    setEditForm({});
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-[#B8860B]" />
            <h1 className="text-2xl font-black text-gray-900">Incident Log</h1>
            {openCount > 0 && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                {openCount} open
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">Official record of incidents during drills and unit activities. Officer access only.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="shrink-0">
          <Plus className="mr-1.5 h-4 w-4" /> File Report
        </Button>
      </div>

      {/* New report form */}
      {showForm && (
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-black text-gray-900">New Incident Report</h2>
            <button onClick={() => setShowForm(false)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Date *</label>
                <input
                  type="date"
                  value={form.incident_date}
                  onChange={(e) => setForm((p) => ({ ...p, incident_date: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Time (approx.)</label>
                <input
                  type="time"
                  value={form.incident_time}
                  onChange={(e) => setForm((p) => ({ ...p, incident_time: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Type *</label>
                <select
                  value={form.incident_type}
                  onChange={(e) => setForm((p) => ({ ...p, incident_type: e.target.value as IncidentReport["incident_type"] }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400"
                >
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={4}
                placeholder="Describe what happened, in the order it occurred. Include any actions taken at the time."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-gray-400"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Cadets Involved</label>
                <input
                  type="text"
                  value={cadetsInput}
                  onChange={(e) => setCadetsInput(e.target.value)}
                  placeholder="Last name, Last name, …"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-gray-400"
                />
                <p className="mt-1 text-xs text-gray-400">Comma-separated names</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Witnesses</label>
                <input
                  type="text"
                  value={form.witnesses}
                  onChange={(e) => setForm((p) => ({ ...p, witnesses: e.target.value }))}
                  placeholder="Names of officers or cadets present"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Follow-up Action</label>
              <textarea
                value={form.follow_up_action}
                onChange={(e) => setForm((p) => ({ ...p, follow_up_action: e.target.value }))}
                rows={2}
                placeholder="What steps have been or will be taken? (e.g., parent notified, EMS called, cadet removed from drill)"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-gray-400"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !form.incident_date || !form.description}
            >
              {saving ? "Filing…" : "File Report"}
            </Button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="mb-5 flex items-center gap-2">
        {(["all", "open", "closed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${
              statusFilter === f
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? `All (${reports.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${reports.filter((r) => r.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Reports list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-400">No incidents recorded.</p>
          <p className="mt-1 text-xs text-gray-300">File a report after any incident during a drill or unit activity.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => (
            <div key={report.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              {/* Header row */}
              <div
                className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4"
                onClick={() => setExpanded(expanded === report.id ? null : report.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[report.incident_type]}`}>
                    {TYPE_LABELS[report.incident_type]}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {new Date(report.incident_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {report.incident_time && ` · ${report.incident_time}`}
                    </p>
                    <p className="truncate text-xs text-gray-400">{report.location}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {report.status === "open" ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
                      <Clock className="h-3 w-3" /> Open
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                      <CheckCircle className="h-3 w-3" /> Closed
                    </span>
                  )}
                  {expanded === report.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === report.id && (
                <div className="border-t border-gray-100 px-5 py-5">
                  {editingId === report.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Description</label>
                        <textarea
                          value={editForm.description ?? report.description}
                          onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                          rows={4}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Follow-up Action</label>
                        <textarea
                          value={editForm.follow_up_action ?? report.follow_up_action ?? ""}
                          onChange={(e) => setEditForm((p) => ({ ...p, follow_up_action: e.target.value }))}
                          rows={2}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdate(report.id)} disabled={saving}>
                          {saving ? "Saving…" : "Save Changes"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditForm({}); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-sm">
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Description</p>
                        <p className="leading-relaxed text-gray-700 whitespace-pre-wrap">{report.description}</p>
                      </div>
                      {report.cadets_involved.length > 0 && (
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Cadets Involved</p>
                          <div className="flex flex-wrap gap-1.5">
                            {report.cadets_involved.map((c) => (
                              <span key={c} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">{c}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {report.witnesses && (
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Witnesses</p>
                          <p className="text-gray-700">{report.witnesses}</p>
                        </div>
                      )}
                      {report.follow_up_action && (
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Follow-up Action</p>
                          <p className="leading-relaxed text-gray-700 whitespace-pre-wrap">{report.follow_up_action}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                        <p className="text-xs text-gray-400">
                          Filed {new Date(report.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {report.updated_at !== report.created_at && ` · Updated ${new Date(report.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setEditingId(report.id); setEditForm({ description: report.description, follow_up_action: report.follow_up_action ?? "" }); }}
                          >
                            Edit
                          </Button>
                          {report.status === "open" ? (
                            <Button size="sm" onClick={() => handleClose(report.id)} className="bg-green-600 hover:bg-green-700">
                              Mark Closed
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleReopen(report.id)}>
                              Reopen
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
