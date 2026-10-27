"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format, subDays, parseISO } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Save,
  Pencil,
  X,
  CalendarDays,
  Clock,
  MapPin,
  FileText,
  Printer,
  Shirt,
  Shield,
  BookOpen,
  LayoutList,
  Copy,
  FolderOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Target,
  AlertTriangle,
  Megaphone,
  User,
  SendHorizontal,
  ThumbsUp,
  ThumbsDown,
  CheckCheck,
  MessageSquare,
  Lightbulb,
  Users,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitPodForApproval, approvePod, rejectPod, addPodComment, resolvePodComment, getPodComments } from "@/app/(app)/settings/actions";
import type { PodSection, PodReviewComment } from "@/app/(app)/settings/actions";
import type { PlanOfDay, PodItem, PodCategory, PodTemplate, PodStatus } from "@/types/database";
import type { DrillSuggestion } from "@/app/(app)/drill-suggestions/actions";
import { HintButton } from "@/components/shared/hint-button";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { AbsenceRequestButton } from "@/components/absence-requests/absence-request-button";
import type { Profile } from "@/types/database";

const POD_HINTS = [
  { heading: "Writing the POD", body: "Click 'Edit' to enter edit mode. Fill in Uniform of the Day, Officer in Charge, the schedule items (with times and descriptions), Special Events, and the Safety Brief." },
  { heading: "Schedule items", body: "Add as many line items as needed using the '+ Add Item' button. Drag to reorder. Each item has a time, description, and optional notes." },
  { heading: "Approval workflow", body: "After editing, click 'Submit for Approval'. The CO or XO will see a notification and can Approve or Reject it. Only approved PODs are visible to cadets." },
  { heading: "Publish as Announcement", body: "Once a POD is filled out, the 'Publish as Announcement' button posts the full plan to the Announcements feed for all cadets to see." },
  { heading: "Templates", body: "Save a POD as a template using the template button. Load it on a future date to pre-fill the standard items and adjust from there." },
  { heading: "Copy from previous day", body: "The copy icon lets you pull the previous day's POD as a starting point, saving time on recurring schedule items." },
];

// ─── Types ──────────────────────────────────────────────────────────────────

type ProfileSnippet = {
  id: string;
  full_name: string;
  rank: string | null;
  role: string;
};

const CATEGORIES: { value: PodCategory; label: string; dot: string }[] = [
  { value: "formation", label: "Formation", dot: "bg-[#003087]" },
  { value: "pt", label: "PT", dot: "bg-orange-500" },
  { value: "training", label: "Training", dot: "bg-blue-500" },
  { value: "meal", label: "Meal", dot: "bg-green-500" },
  { value: "admin", label: "Admin", dot: "bg-amber-500" },
  { value: "general", label: "General", dot: "bg-gray-400" },
];

const CAT_COLORS: Record<PodCategory, string> = {
  formation: "border-[#003087] bg-[#003087]/5 text-[#003087]",
  pt: "border-orange-300 bg-orange-50 text-orange-700",
  training: "border-blue-300 bg-blue-50 text-blue-700",
  meal: "border-green-300 bg-green-50 text-green-700",
  admin: "border-amber-300 bg-amber-50 text-amber-700",
  general: "border-gray-200 bg-gray-50 text-gray-600",
  side_event: "border-purple-300 bg-purple-50 text-purple-700",
};

function blankSideEvent(): PodItem {
  return { id: generateId(), time: "", activity: "", location: "", category: "side_event", responsible_id: null, responsible_name: null };
}

const STATUS_CONFIG: Record<PodStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:     { label: "Draft",            color: "text-gray-600",   bg: "bg-gray-100",   border: "border-gray-200" },
  submitted: { label: "Pending Approval", color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-200" },
  approved:  { label: "Approved",         color: "text-green-700",  bg: "bg-green-50",   border: "border-green-200" },
  rejected:  { label: "Returned",         color: "text-red-700",    bg: "bg-red-50",     border: "border-red-200" },
};

const UNIFORM_PRESETS = [
  "NWU Type III (Blueberries)",
  "NWU Type I (Utilities)",
  "Service Dress Blue",
  "Service Dress White",
  "Summer White",
  "PT Gear (Navy Blue/Gold)",
  "Civilian Attire",
];

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

function blankItem(): PodItem {
  return { id: generateId(), time: "", activity: "", location: "", category: "general", responsible_id: null, responsible_name: null };
}

// ─── Print Styles ────────────────────────────────────────────────────────────

const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #pod-print-root, #pod-print-root * { visibility: visible !important; }
  #pod-print-root { position: fixed; inset: 0; background: white; padding: 32px 40px; font-family: 'Courier New', monospace; font-size: 11pt; }
  .print-hide { display: none !important; }
}
`;

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ num, icon: Icon, title }: { num: number; icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b-2 border-[#003087] pb-1">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#003087] text-xs font-bold text-white">
        {num}
      </span>
      <Icon className="h-4 w-4 text-[#003087]" />
      <span className="font-bold uppercase tracking-wider text-[#003087]">{title}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: PodStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {status === "approved" && <CheckCheck className="h-3 w-3" />}
      {status === "submitted" && <SendHorizontal className="h-3 w-3" />}
      {status === "rejected" && <AlertTriangle className="h-3 w-3" />}
      {cfg.label}
    </span>
  );
}

function TemplateModal({
  templates,
  onLoad,
  onClose,
}: {
  templates: PodTemplate[];
  onLoad: (t: PodTemplate) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-gray-800">Load Template</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <div className="max-h-80 overflow-y-auto p-4">
          {templates.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">No templates saved yet. Save a POD as a template first.</p>
          )}
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => { onLoad(t); onClose(); }}
              className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-gray-50"
            >
              <FolderOpen className="mt-0.5 h-5 w-5 shrink-0 text-[#B8860B]" />
              <div>
                <p className="font-semibold text-gray-800">{t.name}</p>
                {t.description && <p className="text-sm text-gray-500">{t.description}</p>}
                <p className="mt-0.5 text-xs text-gray-400">
                  {(t.items?.length ?? 0)} items
                  {t.uniform_of_day ? ` · ${t.uniform_of_day}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SaveTemplateModal({
  onSave,
  onClose,
}: {
  onSave: (name: string, desc: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-gray-800">Save as Template</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <div className="space-y-3 p-5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Template Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Drill Weekend"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Description</label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Optional note about when to use this"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!name.trim()}
            onClick={() => { if (name.trim()) onSave(name.trim(), desc.trim()); }}
            className="bg-[#003087] hover:bg-[#002266]"
          >
            Save Template
          </Button>
        </div>
      </div>
    </div>
  );
}

function RejectModal({
  onReject,
  onClose,
}: {
  onReject: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-gray-800">Return for Revision</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <div className="p-5">
          <label className="mb-1 block text-sm font-semibold text-gray-700">Reason / Guidance *</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain what needs to be corrected or updated…"
            rows={4}
            className="w-full resize-y rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
          />
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!reason.trim()}
            onClick={() => { if (reason.trim()) onReject(reason.trim()); }}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Return POD
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Review Comment Panel ────────────────────────────────────────────────────

const SECTION_LABELS: Record<PodSection, string> = {
  uniform:        "Uniform",
  oic:            "Officer in Charge",
  schedule:       "Schedule",
  safety_brief:   "Safety Brief",
  special_events: "Special Events",
  general:        "General",
};

function ReviewCommentPanel({
  podId,
  canComment,
  comments,
  onCommentAdded,
  onCommentResolved,
}: {
  podId: string;
  canComment: boolean;
  comments: PodReviewComment[];
  onCommentAdded: (c: PodReviewComment) => void;
  onCommentResolved: (id: string, resolved: boolean) => void;
}) {
  const [section, setSection] = useState<PodSection>("general");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const open = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);

  const handleAdd = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    const res = await addPodComment(podId, section, body);
    setSubmitting(false);
    if (res.error) { return; }
    if (res.comment) { onCommentAdded(res.comment); }
    setBody("");
  };

  const handleResolve = async (id: string, current: boolean) => {
    const res = await resolvePodComment(id, !current);
    if (!res.error) onCommentResolved(id, !current);
  };

  if (!canComment && comments.length === 0) return null;

  return (
    <div className="print-hide rounded-xl border border-blue-100 bg-blue-50/60 space-y-3 p-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-[#003087]" />
        <h3 className="text-sm font-bold text-[#003087]">Review Comments</h3>
        {open.length > 0 && (
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{open.length} open</span>
        )}
      </div>

      {/* Add comment form — officers/SNCOs only */}
      {canComment && (
        <div className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-white p-3">
          <div className="flex flex-wrap gap-2">
            <select
              value={section}
              onChange={(e) => setSection(e.target.value as PodSection)}
              className="rounded border px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#003087]"
            >
              {(Object.keys(SECTION_LABELS) as PodSection[]).map((s) => (
                <option key={s} value={s}>{SECTION_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Leave a note for cadet leadership — they'll see it and can mark it resolved once addressed…"
            rows={2}
            className="w-full resize-none rounded border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#003087]"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleAdd} disabled={submitting || !body.trim()} className="bg-[#003087] hover:bg-[#002266] text-white">
              <SendHorizontal className="mr-1 h-3.5 w-3.5" />{submitting ? "Adding…" : "Add Comment"}
            </Button>
          </div>
        </div>
      )}

      {/* Open comments */}
      {open.length > 0 && (
        <div className="space-y-2">
          {open.map((c) => (
            <div key={c.id} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2.5">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">{SECTION_LABELS[c.section as PodSection] ?? c.section}</span>
                  <span className="text-[10px] text-gray-400">· {c.author_name}</span>
                </div>
                <p className="text-xs text-gray-700 mt-0.5">{c.body}</p>
              </div>
              <button
                onClick={() => handleResolve(c.id, c.resolved)}
                title="Mark as resolved"
                className="shrink-0 rounded-full p-0.5 text-gray-300 hover:text-green-600 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Resolved toggle */}
      {resolved.length > 0 && (
        <div>
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {showResolved ? "Hide" : "Show"} {resolved.length} resolved comment{resolved.length !== 1 ? "s" : ""}
          </button>
          {showResolved && (
            <div className="mt-2 space-y-1.5">
              {resolved.map((c) => (
                <div key={c.id} className="flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 opacity-60">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{SECTION_LABELS[c.section as PodSection] ?? c.section}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{c.body}</p>
                  </div>
                  <button
                    onClick={() => handleResolve(c.id, c.resolved)}
                    title="Re-open"
                    className="shrink-0 rounded-full p-0.5 text-gray-300 hover:text-amber-500 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {open.length === 0 && resolved.length === 0 && canComment && (
        <p className="text-xs text-gray-400 text-center py-1">No comments yet. Add notes for specific sections above.</p>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

type LrpBlock = { id: string; topic: string; block_type: string; description?: string | null };

export function PodClient({
  initialPod,
  initialDate,
  canEdit,
  canApprove,
  canAmend,
  allProfiles,
  initialTemplates,
  unitName,
  motto,
  initialAllDates,
  lrpByDate = {},
  initialDrillSummary = null,
  initialSuggestions = [],
  profile,
}: {
  initialPod: PlanOfDay | null;
  initialDate: string;
  canEdit: boolean;
  canApprove: boolean;
  canAmend?: boolean;
  allProfiles: ProfileSnippet[];
  initialTemplates: PodTemplate[];
  unitName: string;
  motto: string;
  initialAllDates: string[];
  lrpByDate?: Record<string, LrpBlock[]>;
  initialDrillSummary?: { present: number; absent: number; excused: number; total: number } | null;
  initialSuggestions?: DrillSuggestion[];
  profile?: Profile;
}) {
  const [date, setDate] = useState(initialDate);
  const [pod, setPod] = useState<PlanOfDay | null>(initialPod);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<PodTemplate[]>(initialTemplates);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [allDates, setAllDates] = useState<string[]>(initialAllDates);
  const [showNewDrillPicker, setShowNewDrillPicker] = useState(false);
  const [newDrillDate, setNewDrillDate] = useState("");
  const [approving, setApproving] = useState(false);
  const [isAmending, setIsAmending] = useState(false);
  const [drillSummary, setDrillSummary] = useState<{ present: number; absent: number; excused: number; total: number } | null>(initialDrillSummary);
  const [publishingAnnouncement, setPublishingAnnouncement] = useState(false);
  const [reviewComments, setReviewComments] = useState<PodReviewComment[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Edit state
  const [uniformOfDay, setUniformOfDay] = useState(initialPod?.uniform_of_day ?? "");
  const [watchBill, setWatchBill] = useState(initialPod?.watch_bill ?? "");
  const [items, setItems] = useState<PodItem[]>(initialPod?.items ?? []);
  const [notes, setNotes] = useState(initialPod?.notes ?? "");
  const [trainingObjective, setTrainingObjective] = useState(initialPod?.training_objective ?? "");
  const [officerInChargeId, setOfficerInChargeId] = useState(initialPod?.officer_in_charge_id ?? "");
  const [officerInChargeName, setOfficerInChargeName] = useState(initialPod?.officer_in_charge_name ?? "");
  const [specialEvents, setSpecialEvents] = useState(initialPod?.special_events ?? "");
  const [safetyBrief, setSafetyBrief] = useState(initialPod?.safety_brief ?? "");
  const [showUniformPresets, setShowUniformPresets] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // ── Load comments when pod changes ───────────────────────────────────────

  useEffect(() => {
    if (!pod?.id) { setReviewComments([]); return; }
    getPodComments(pod.id).then(setReviewComments);
  }, [pod?.id]);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadDate = useCallback(async (d: string) => {
    setLoading(true);
    setEditing(false);
    const supabase = createClient();
    const [{ data }, { data: drillSession }] = await Promise.all([
      supabase.from("plan_of_day").select("*").eq("date", d).maybeSingle(),
      supabase.from("drill_sessions")
        .select("id, locked, drill_attendance(status), watch_bills(position, notes, profiles(full_name, rank))")
        .eq("date", d)
        .maybeSingle(),
    ]);
    const p = data as PlanOfDay | null;
    setPod(p);
    setItems(p?.items ?? []);
    setUniformOfDay(p?.uniform_of_day ?? "");
    // Auto-populate watch bill from drill assignments if POD has none
    const drillWatchBills = (drillSession as unknown as { watch_bills?: { position: string; notes: string | null; profiles: { full_name: string; rank: string | null } | null }[] } | null)?.watch_bills ?? [];
    let resolvedWatchBill = p?.watch_bill ?? "";
    if (!resolvedWatchBill && drillWatchBills.length > 0) {
      resolvedWatchBill = drillWatchBills
        .map((wb) => {
          const name = wb.profiles ? (wb.profiles.rank ? `${wb.profiles.rank} ${wb.profiles.full_name}` : wb.profiles.full_name) : "—";
          return `${wb.position}: ${name}${wb.notes ? ` (${wb.notes})` : ""}`;
        })
        .join("\n");
    }
    setWatchBill(resolvedWatchBill);
    setNotes(p?.notes ?? "");
    setTrainingObjective(p?.training_objective ?? "");
    setOfficerInChargeId(p?.officer_in_charge_id ?? "");
    setOfficerInChargeName(p?.officer_in_charge_name ?? "");
    setSpecialEvents(p?.special_events ?? "");
    setSafetyBrief(p?.safety_brief ?? "");
    // Compute attendance summary for the new date
    if (drillSession && (drillSession as unknown as { locked: boolean }).locked) {
      const rows = ((drillSession as unknown as { drill_attendance: { status: string }[] }).drill_attendance) ?? [];
      const counts = { present: 0, absent: 0, excused: 0, late: 0 };
      for (const r of rows) counts[r.status as keyof typeof counts] = (counts[r.status as keyof typeof counts] ?? 0) + 1;
      setDrillSummary({ present: counts.present + counts.late, absent: counts.absent, excused: counts.excused, total: rows.length });
    } else {
      setDrillSummary(null);
    }
    setLoading(false);
  }, []);

  const goToDrillDate = (target: string) => {
    setDate(target);
    loadDate(target);
  };

  const drillIdx = allDates.indexOf(date);
  const prevDrillDate = drillIdx > 0 ? allDates[drillIdx - 1] : null;
  const nextDrillDate = drillIdx >= 0 && drillIdx < allDates.length - 1 ? allDates[drillIdx + 1] : null;

  const openNewDrill = (targetDate: string) => {
    setDate(targetDate);
    setPod(null);
    setItems([]);
    setUniformOfDay("");
    setWatchBill("");
    setNotes("");
    setTrainingObjective("");
    setOfficerInChargeId("");
    setOfficerInChargeName("");
    setSpecialEvents("");
    setSafetyBrief("");
    setEditing(true);
    setShowNewDrillPicker(false);
    setNewDrillDate("");
  };

  // ── Item manipulation ─────────────────────────────────────────────────────

  const addItem = () => setItems((prev) => [...prev, blankItem()]);

  const updateItem = (id: string, field: keyof PodItem, value: string) =>
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === "responsible_id") {
          const p = allProfiles.find((p) => p.id === value);
          return { ...item, responsible_id: value || null, responsible_name: p ? (p.rank ? `${p.rank} ${p.full_name}` : p.full_name) : null };
        }
        return { ...item, [field]: value };
      })
    );

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const moveItem = (id: string, dir: -1 | 1) =>
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });

  // ── OIC selector ──────────────────────────────────────────────────────────

  const handleOicChange = (profileId: string) => {
    setOfficerInChargeId(profileId);
    if (!profileId) {
      setOfficerInChargeName("");
      return;
    }
    const p = allProfiles.find((p) => p.id === profileId);
    setOfficerInChargeName(p ? (p.rank ? `${p.rank} ${p.full_name}` : p.full_name) : "");
  };

  // ── Save POD ──────────────────────────────────────────────────────────────

  const savePod = async () => {
    setSaving(true);
    const supabase = createClient();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { data: me } = await supabase.from("profiles").select("id").eq("user_id", userId ?? "").maybeSingle();

    const cleanItems = items.filter((i) => i.activity.trim());
    const payload = {
      date,
      uniform_of_day: uniformOfDay.trim() || null,
      watch_bill: watchBill.trim() || null,
      training_objective: trainingObjective.trim() || null,
      officer_in_charge_id: officerInChargeId || null,
      officer_in_charge_name: officerInChargeName || null,
      special_events: specialEvents.trim() || null,
      safety_brief: safetyBrief.trim() || null,
      items: cleanItems,
      notes: notes.trim() || null,
      updated_by: me?.id ?? null,
      updated_at: new Date().toISOString(),
      // If returning from rejection, reset to draft; if amending an approved POD, keep approved + record amendment time
      ...(pod?.status === "rejected" ? { status: "draft", approved_by: null, approved_by_name: null, approved_at: null, approval_notes: null } : {}),
      ...(isAmending ? { amended_at: new Date().toISOString() } : {}),
    };

    let res;
    if (pod) {
      res = await supabase.from("plan_of_day").update(payload as never).eq("id", pod.id).select().single();
    } else {
      res = await supabase.from("plan_of_day").insert({ ...payload, status: "draft", created_by: me?.id ?? null } as never).select().single();
    }

    if (res.error) {
      toast.error("Failed to save POD");
    } else {
      setPod(res.data as PlanOfDay);
      toast.success(isAmending ? "POD amended" : "Plan of the Day saved");
      setEditing(false);
      setIsAmending(false);
      if (!pod) {
        setAllDates((prev) => [...prev, date].sort());
      }
    }
    setSaving(false);
  };

  // ── Approval actions ──────────────────────────────────────────────────────

  const handleSubmitForApproval = async () => {
    if (!pod) return;
    setApproving(true);
    const result = await submitPodForApproval(pod.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      setPod((prev) => prev ? { ...prev, status: "submitted" } : prev);
      toast.success("POD submitted for approval");
    }
    setApproving(false);
  };

  const handleApprove = async () => {
    if (!pod) return;
    setApproving(true);
    const result = await approvePod(pod.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      await loadDate(date);
      toast.success("POD approved");
    }
    setApproving(false);
  };

  const handleReject = async (reason: string) => {
    if (!pod) return;
    setApproving(true);
    setShowRejectModal(false);
    const result = await rejectPod(pod.id, reason);
    if (result.error) {
      toast.error(result.error);
    } else {
      await loadDate(date);
      toast.success("POD returned for revision");
    }
    setApproving(false);
  };

  // ── Templates ─────────────────────────────────────────────────────────────

  const loadTemplate = (t: PodTemplate) => {
    setItems((t.items ?? []).map((i) => ({ ...i, id: generateId() })));
    if (t.uniform_of_day) setUniformOfDay(t.uniform_of_day);
    if (t.watch_bill) setWatchBill(t.watch_bill);
    if (t.training_objective) setTrainingObjective(t.training_objective);
    if (t.special_events) setSpecialEvents(t.special_events);
    if (t.safety_brief) setSafetyBrief(t.safety_brief);
    if (t.officer_in_charge_id) {
      setOfficerInChargeId(t.officer_in_charge_id);
      setOfficerInChargeName(t.officer_in_charge_name ?? "");
    }
    toast.success(`Template "${t.name}" loaded`);
  };

  const saveTemplate = async (name: string, desc: string) => {
    const supabase = createClient();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { data: me } = await supabase.from("profiles").select("id").eq("user_id", userId ?? "").maybeSingle();

    const { data, error } = await supabase.from("pod_templates").insert({
      name,
      description: desc || null,
      items: items.filter((i) => i.activity.trim()),
      uniform_of_day: uniformOfDay.trim() || null,
      watch_bill: watchBill.trim() || null,
      training_objective: trainingObjective.trim() || null,
      officer_in_charge_id: officerInChargeId || null,
      officer_in_charge_name: officerInChargeName || null,
      special_events: specialEvents.trim() || null,
      safety_brief: safetyBrief.trim() || null,
      created_by: me?.id ?? null,
    }).select().single();

    if (error) {
      toast.error("Failed to save template");
    } else {
      setTemplates((prev) => [...prev, data as PodTemplate]);
      toast.success(`Template "${name}" saved`);
    }
    setShowSaveModal(false);
  };

  // ── Copy from prev day ────────────────────────────────────────────────────

  const copyPrevDay = async () => {
    const prev = format(subDays(parseISO(date), 1), "yyyy-MM-dd");
    const supabase = createClient();
    const { data } = await supabase.from("plan_of_day").select("*").eq("date", prev).maybeSingle();
    if (!data) { toast.error("No POD found for yesterday"); return; }
    const p = data as PlanOfDay;
    const prevItems: PodItem[] = (p.items ?? []).map((i: PodItem) => ({ ...i, id: generateId() }));
    setItems(prevItems);
    if (p.uniform_of_day) setUniformOfDay(p.uniform_of_day);
    if (p.watch_bill) setWatchBill(p.watch_bill);
    if (p.notes) setNotes(p.notes);
    if (p.training_objective) setTrainingObjective(p.training_objective);
    if (p.special_events) setSpecialEvents(p.special_events);
    if (p.safety_brief) setSafetyBrief(p.safety_brief);
    const hasPt = prevItems.some((i) => i.category === "pt" && (i.pt_type || i.pt_notes));
    toast.success(
      hasPt
        ? "Copied from previous day — PT plan details were included. Update them for today."
        : "Copied from previous day"
    );
  };

  // ── Print ─────────────────────────────────────────────────────────────────

  const handlePrint = () => window.open(`/pod/${date}/print`, "_blank");

  const cancelEdit = () => {
    setItems(pod?.items ?? []);
    setUniformOfDay(pod?.uniform_of_day ?? "");
    setWatchBill(pod?.watch_bill ?? "");
    setNotes(pod?.notes ?? "");
    setTrainingObjective(pod?.training_objective ?? "");
    setOfficerInChargeId(pod?.officer_in_charge_id ?? "");
    setOfficerInChargeName(pod?.officer_in_charge_name ?? "");
    setSpecialEvents(pod?.special_events ?? "");
    setSafetyBrief(pod?.safety_brief ?? "");
    setEditing(false);
    setIsAmending(false);
  };

  // ── Publish POD as Announcement ───────────────────────────────────────────

  const publishPodAsAnnouncement = async () => {
    if (!pod) return;
    setPublishingAnnouncement(true);
    const supabase = createClient();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { data: me } = await supabase.from("profiles").select("id").eq("user_id", userId ?? "").maybeSingle();

    const lines: string[] = [];
    if (pod.uniform_of_day) lines.push(`**Uniform:** ${pod.uniform_of_day}`);
    if (pod.officer_in_charge_name) lines.push(`**OIC:** ${pod.officer_in_charge_name}`);
    if (pod.training_objective) lines.push(`\n**Training Objective:** ${pod.training_objective}`);
    const sorted = [...(pod.items ?? [])].sort((a, b) => a.time.localeCompare(b.time));
    if (sorted.length > 0) {
      lines.push("\n**Schedule:**");
      for (const item of sorted) {
        lines.push(`${item.time} – ${item.activity}${item.location ? ` (${item.location})` : ""}`);
      }
    }
    if (pod.special_events) lines.push(`\n**Special Events:** ${pod.special_events}`);
    if (pod.safety_brief) lines.push(`\n**Safety Brief:** ${pod.safety_brief}`);

    const body = lines.join("\n");
    const title = `Plan of the Day — ${format(parseISO(date), "EEEE, MMMM d, yyyy")}`;

    const { error } = await supabase.from("announcements").insert({
      title,
      body,
      posted_by: me?.id ?? null,
    });

    setPublishingAnnouncement(false);
    if (error) { toast.error(error.message); return; }
    toast.success("POD published as announcement.");
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const displayDate = parseISO(date);
  const todayStr = new Date().toISOString().split("T")[0];
  const isToday = date === todayStr;
  const allEditItems = editing ? items : (pod?.items ?? []);
  const sortedItems = [...allEditItems].filter((i) => i.category !== "side_event").sort((a, b) => a.time.localeCompare(b.time));
  const sideEventItems = allEditItems.filter((i) => i.category === "side_event");
  const hasContent = (pod?.items?.length ?? 0) > 0 || pod?.uniform_of_day || pod?.watch_bill || pod?.notes
    || pod?.training_objective || pod?.officer_in_charge_name || pod?.special_events || pod?.safety_brief;

  const podStatus: PodStatus = pod?.status ?? "draft";
  const canSubmit = canEdit && pod && (podStatus === "draft" || podStatus === "rejected") && !editing;
  const canApproveAction = canApprove && pod && podStatus === "submitted" && !editing;

  // Section numbering helper
  let sectionNum = 0;
  const nextSection = () => { sectionNum++; return sectionNum; };

  return (
    <>
      {/* Print styles injected into head */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLE }} />

      <div className="mx-auto max-w-4xl space-y-5">
        {/* ── Top bar ── */}
        <div className="print-hide flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-[#003087]">Plan of the Day</h1>
              {pod && <StatusBadge status={podStatus} />}
              <HintButton title="Plan of the Day" hints={POD_HINTS} />
            </div>
            <p className="text-sm text-gray-500">Daily operational schedule for {unitName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Cadet: request leave directly from the POD */}
            {!canEdit && profile && (
              <AbsenceRequestButton profile={profile} buttonVariant="outline" />
            )}
            {!editing && hasContent && (
              <Button variant="outline" onClick={handlePrint} className="gap-2 print-hide">
                <Printer className="h-4 w-4" /> Print / PDF
              </Button>
            )}
            {!editing && canEdit && hasContent && (
              <Button
                variant="outline"
                onClick={publishPodAsAnnouncement}
                disabled={publishingAnnouncement}
                className="gap-2 print-hide"
              >
                <Megaphone className="h-4 w-4" />
                {publishingAnnouncement ? "Publishing…" : "Publish as Announcement"}
              </Button>
            )}
            {/* Submit for approval */}
            {canSubmit && (
              <Button
                onClick={handleSubmitForApproval}
                disabled={approving}
                className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <SendHorizontal className="h-4 w-4" />
                {approving ? "Submitting…" : "Submit for Approval"}
              </Button>
            )}
            {/* Approve / Reject */}
            {canApproveAction && (
              <>
                <Button
                  onClick={() => setShowRejectModal(true)}
                  disabled={approving}
                  variant="outline"
                  className="gap-2 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <ThumbsDown className="h-4 w-4" /> Return
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={approving}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <ThumbsUp className="h-4 w-4" />
                  {approving ? "Approving…" : "Approve"}
                </Button>
              </>
            )}
            {canEdit && !editing && podStatus !== "approved" && (
              <Button onClick={() => setEditing(true)} className="gap-2 bg-[#003087] hover:bg-[#002266]">
                <Pencil className="h-4 w-4" />
                {pod ? "Edit POD" : "Create POD"}
              </Button>
            )}
            {(canAmend ?? canApprove) && !editing && podStatus === "approved" && (
              <Button
                onClick={() => { setIsAmending(true); setEditing(true); }}
                variant="outline"
                className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <Pencil className="h-4 w-4" />
                Amend POD
              </Button>
            )}
            {editing && (
              <>
                <Button variant="outline" onClick={() => setShowLoadModal(true)} className="gap-2">
                  <FolderOpen className="h-4 w-4" /> Load Template
                </Button>
                <Button variant="outline" onClick={copyPrevDay} className="gap-2">
                  <Copy className="h-4 w-4" /> Copy Prev Day
                </Button>
                <Button variant="outline" onClick={() => setShowSaveModal(true)} className="gap-2">
                  <BookOpen className="h-4 w-4" /> Save as Template
                </Button>
                <Button variant="outline" onClick={cancelEdit} className="gap-2">
                  <X className="h-4 w-4" /> Cancel
                </Button>
                <Button onClick={savePod} disabled={saving} className="gap-2 bg-[#003087] hover:bg-[#002266]">
                  <Save className="h-4 w-4" />
                  {saving ? "Saving…" : "Save POD"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Approval banner ── */}
        {pod && podStatus === "rejected" && pod.approval_notes && !editing && (
          <div className="print-hide flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-700">Returned for revision</p>
              <p className="mt-0.5 text-sm text-red-600">{pod.approval_notes}</p>
              {pod.approved_by_name && (
                <p className="mt-1 text-xs text-red-400">— {pod.approved_by_name}</p>
              )}
            </div>
          </div>
        )}

        {pod && podStatus === "submitted" && canApprove && (
          <div className="print-hide flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <SendHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-700">
              This POD is awaiting your approval. Review the schedule and use the Approve or Return buttons above.
            </p>
          </div>
        )}

        {/* ── Review comment panel ── */}
        {pod && !editing && (
          <ReviewCommentPanel
            podId={pod.id}
            canComment={canApprove || (pod.status === "submitted" && (canApprove || false))}
            comments={reviewComments}
            onCommentAdded={(c) => setReviewComments((prev) => [...prev, c])}
            onCommentResolved={(id, resolved) =>
              setReviewComments((prev) => prev.map((c) => c.id === id ? { ...c, resolved } : c))
            }
          />
        )}

        {pod && (podStatus === "approved" || podStatus === "submitted" || pod.submitted_by) && (
          <div className="print-hide rounded-xl border border-green-200 bg-green-50 px-4 py-3 space-y-1">
            <div className="flex items-center gap-2">
              <CheckCheck className="h-4 w-4 shrink-0 text-green-600" />
              <p className="text-sm font-semibold text-green-700">POD History</p>
            </div>
            {pod.submitted_by && pod.submitted_at && (
              <p className="text-xs text-green-600 pl-6">
                Submitted {format(parseISO(pod.submitted_at), "MMM d, yyyy 'at' HH:mm")}
              </p>
            )}
            {podStatus === "approved" && pod.approved_by_name && (
              <p className="text-xs text-green-700 pl-6">
                Approved by <strong>{pod.approved_by_name}</strong>
                {pod.approved_at ? ` on ${format(parseISO(pod.approved_at), "MMM d, yyyy 'at' HH:mm")}` : ""}
                {pod.approval_notes ? ` — "${pod.approval_notes}"` : ""}
              </p>
            )}
            {pod.amended_at && (
              <p className="mt-0.5 text-xs text-amber-600 pl-6">
                Amended {format(parseISO(pod.amended_at), "MMM d 'at' HH:mm")}
              </p>
            )}
          </div>
        )}

        {drillSummary && (
          <div className="print-hide flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold">Drill Attendance Locked</p>
              <p className="text-xs mt-0.5">
                <span className="text-green-700 font-medium">{drillSummary.present} present</span>
                {" · "}
                <span className="text-red-600 font-medium">{drillSummary.absent} absent</span>
                {" · "}
                <span className="text-amber-600 font-medium">{drillSummary.excused} excused</span>
                {" · "}
                <span className="text-gray-500">{drillSummary.total} total</span>
              </p>
            </div>
          </div>
        )}

        {/* ── Drill Ideas panel (visible to editors while building the POD) ── */}
        {canEdit && initialSuggestions.length > 0 && (
          <div className="print-hide rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
            <button
              onClick={() => setShowSuggestions((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="font-semibold text-amber-800 text-sm">
                  Drill Ideas ({initialSuggestions.length})
                </span>
                <span className="text-xs text-amber-600">— suggested by cadets &amp; staff</span>
              </div>
              {showSuggestions
                ? <ChevronUp className="h-4 w-4 text-amber-600" />
                : <ChevronDown className="h-4 w-4 text-amber-600" />}
            </button>
            {showSuggestions && (
              <div className="border-t border-amber-200 divide-y divide-amber-100 bg-white">
                {initialSuggestions.map((s) => {
                  const catLabels: Record<string, string> = {
                    pt: "PT", academic: "Academic", leadership: "Leadership",
                    field: "Field Exercise", community: "Community Service",
                    team_building: "Team Building", special_event: "Special Event",
                    drill: "Drill", other: "Other",
                  };
                  return (
                    <div key={s.id} className="px-4 py-3 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">{s.title}</span>
                        <span className="text-xs rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-gray-500">
                          {catLabels[s.category] ?? s.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{s.description}</p>
                      <div className="flex flex-wrap gap-3">
                        {s.location && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" />{s.location}
                          </span>
                        )}
                        {s.duration_minutes && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />{s.duration_minutes}m
                          </span>
                        )}
                        {(s.min_personnel || s.max_personnel) && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Users className="h-3 w-3" />
                            {s.min_personnel && s.max_personnel
                              ? `${s.min_personnel}–${s.max_personnel}`
                              : s.min_personnel ?? s.max_personnel} people
                          </span>
                        )}
                        {s.materials_needed && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Wrench className="h-3 w-3" />{s.materials_needed}
                          </span>
                        )}
                      </div>
                      {s.notes && <p className="text-xs text-gray-400 italic">{s.notes}</p>}
                      <p className="text-xs text-gray-400">by {s.suggested_by_name}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Date navigator ── */}
        <div className="print-hide rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => prevDrillDate && goToDrillDate(prevDrillDate)}
              disabled={!prevDrillDate || editing || loading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              title={prevDrillDate ? `Go to ${format(parseISO(prevDrillDate), "MMM d")}` : "No earlier drill days"}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {allDates.length > 0 ? (
              <div className="flex flex-1 items-center justify-center gap-2 min-w-0">
                <CalendarDays className="h-4 w-4 shrink-0 text-[#003087]" />
                <select
                  value={allDates.includes(date) ? date : ""}
                  onChange={(e) => e.target.value && goToDrillDate(e.target.value)}
                  disabled={editing || loading}
                  className="min-w-0 flex-1 truncate bg-transparent text-center font-bold text-[#003087] focus:outline-none disabled:opacity-60 cursor-pointer"
                >
                  {allDates.map((d) => (
                    <option key={d} value={d}>
                      {format(parseISO(d), "EEE, MMM d, yyyy")}{d === todayStr ? " — Today" : ""}
                    </option>
                  ))}
                  {!allDates.includes(date) && (
                    <option value={date}>{format(displayDate, "EEE, MMM d, yyyy")} (new)</option>
                  )}
                </select>
                {isToday && (
                  <span className="shrink-0 rounded-full bg-[#003087]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#003087]">
                    Today
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center gap-2">
                <CalendarDays className="h-4 w-4 text-gray-300" />
                <span className="text-sm text-gray-400">No drill days yet</span>
              </div>
            )}

            <button
              onClick={() => nextDrillDate && goToDrillDate(nextDrillDate)}
              disabled={!nextDrillDate || editing || loading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              title={nextDrillDate ? `Go to ${format(parseISO(nextDrillDate), "MMM d")}` : "No later drill days"}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {canEdit && (
            <div className="border-t bg-gray-50/50 px-4 py-2">
              {showNewDrillPicker ? (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" />
                  <input
                    type="date"
                    value={newDrillDate}
                    onChange={(e) => setNewDrillDate(e.target.value)}
                    className="flex-1 rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
                  />
                  <Button
                    size="sm"
                    disabled={!newDrillDate}
                    onClick={() => newDrillDate && openNewDrill(newDrillDate)}
                    className="bg-[#003087] hover:bg-[#002266]"
                  >
                    Create
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowNewDrillPicker(false); setNewDrillDate(""); }}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewDrillPicker(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#003087] hover:text-[#002266] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> New Drill Day
                </button>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading…</div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            VIEW MODE
        ════════════════════════════════════════════════════════════════ */}
        {!loading && !editing && (
          !hasContent ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-20 text-center">
              <LayoutList className="mb-3 h-12 w-12 text-gray-200" />
              <p className="font-semibold text-gray-400">No POD for this day</p>
              {canEdit && (
                <p className="mt-1 text-sm text-gray-300">
                  Click &ldquo;Create POD&rdquo; to build the day&apos;s schedule.
                </p>
              )}
            </div>
          ) : (
            <div id="pod-print-root" ref={printRef} className="space-y-5">
              {/* Print-only header */}
              <div className="hidden print:block mb-6">
                <div className="text-center border-b-2 border-black pb-3 mb-4">
                  <p className="text-sm font-bold uppercase tracking-widest">U.S. Naval Sea Cadet Corps</p>
                  <h1 className="text-2xl font-bold uppercase tracking-wider">{unitName}</h1>
                  <h2 className="text-xl font-bold uppercase">Plan of the Day</h2>
                  <p className="font-bold">{format(displayDate, "EEEE, d MMMM yyyy").toUpperCase()}</p>
                  <p className="text-sm italic mt-1">&ldquo;{motto}&rdquo;</p>
                </div>
              </div>

              {/* OIC + Approval header strip */}
              {(pod?.officer_in_charge_name || pod?.officer_in_charge_id || podStatus === "approved") && (
                <div className="rounded-xl border bg-[#003087]/[0.03] border-[#003087]/10 p-4 flex flex-wrap items-center gap-4">
                  {(pod?.officer_in_charge_name || pod?.officer_in_charge_id) && (() => {
                    // Resolve live name from profile to avoid staleness after rank/name changes
                    const liveOic = pod.officer_in_charge_id ? allProfiles.find((p) => p.id === pod.officer_in_charge_id) : null;
                    const oicName = liveOic
                      ? (liveOic.rank ? `${liveOic.rank} ${liveOic.full_name}` : liveOic.full_name)
                      : pod.officer_in_charge_name;
                    return oicName ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-[#003087]" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#003087]/60">Officer in Charge</p>
                          <p className="font-semibold text-[#003087]">{oicName}</p>
                        </div>
                      </div>
                    ) : null;
                  })()}
                  {podStatus === "approved" && pod?.approved_by_name && (
                    <div className="flex items-center gap-2 ml-auto">
                      <CheckCheck className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-green-600/70">Approved By</p>
                        <p className="font-semibold text-green-700">{pod.approved_by_name}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Training Objective */}
              {pod?.training_objective && (() => { const n = nextSection(); return (
                <div className="rounded-xl border bg-white p-5 shadow-sm">
                  <SectionLabel num={n} icon={Target} title="Training Objective" />
                  <p className="mt-3 text-gray-800 leading-relaxed">{pod.training_objective}</p>
                </div>
              ); })()}

              {/* Uniform of the Day */}
              {pod?.uniform_of_day && (() => { const n = nextSection(); return (
                <div className="rounded-xl border bg-white p-5 shadow-sm">
                  <SectionLabel num={n} icon={Shirt} title="Uniform of the Day" />
                  <p className="mt-3 text-lg font-semibold text-gray-800">{pod.uniform_of_day}</p>
                </div>
              ); })()}

              {/* Special Events / Announcements */}
              {pod?.special_events && (() => { const n = nextSection(); return (
                <div className="rounded-xl border bg-white p-5 shadow-sm">
                  <SectionLabel num={n} icon={Megaphone} title="Special Events / Announcements" />
                  <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">{pod.special_events}</p>
                </div>
              ); })()}

              {/* Safety Brief */}
              {pod?.safety_brief && (() => { const n = nextSection(); return (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                  <SectionLabel num={n} icon={AlertTriangle} title="Safety Brief" />
                  <p className="mt-3 whitespace-pre-wrap text-sm text-amber-900 leading-relaxed">{pod.safety_brief}</p>
                </div>
              ); })()}

              {/* Schedule of Events */}
              {(pod?.items?.length ?? 0) > 0 && (() => { const n = nextSection(); return (
                <div className="rounded-xl border bg-white shadow-sm">
                  <div className="p-5 pb-3">
                    <SectionLabel num={n} icon={Clock} title="Schedule of Events" />
                  </div>
                  <div className="divide-y">
                    {sortedItems.map((item, idx) => (
                      <div key={item.id} className={`flex gap-4 px-5 py-4 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                        <div className="w-16 shrink-0 text-center">
                          <span className="font-mono text-base font-bold text-[#003087]">{item.time}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className={`mt-1.5 h-3 w-3 rounded-full ${CATEGORIES.find(c => c.value === item.category)?.dot ?? "bg-gray-300"}`} />
                          {idx < sortedItems.length - 1 && <div className="mt-1 flex-1 w-px bg-gray-200" />}
                        </div>
                        <div className="flex-1 min-w-0 pb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-gray-800">{item.activity}</p>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${CAT_COLORS[item.category]}`}>
                              {item.category}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-gray-500">
                            {item.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" /> {item.location}
                              </span>
                            )}
                            {(item.responsible_name || item.responsible_id) && (() => {
                              // Resolve current name from profile if ID is stored (prevents staleness)
                              const liveProfile = item.responsible_id ? allProfiles.find((p) => p.id === item.responsible_id) : null;
                              const displayName = liveProfile
                                ? (liveProfile.rank ? `${liveProfile.rank} ${liveProfile.full_name}` : liveProfile.full_name)
                                : item.responsible_name;
                              return displayName ? (
                                <span className="flex items-center gap-1">
                                  <Shield className="h-3.5 w-3.5 text-[#B8860B]" />
                                  <span className="font-medium text-[#003087]">{displayName}</span>
                                </span>
                              ) : null;
                            })()}
                          </div>
                          {/* PT plan — staff-only, not shown to cadets */}
                          {canEdit && item.category === "pt" && (item.pt_type || item.pt_notes) && (
                            <div className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs text-orange-700">
                              <span className="font-bold uppercase tracking-wide text-orange-400 text-[10px]">PT Plan:</span>
                              {item.pt_type && <span className="font-semibold">{item.pt_type}</span>}
                              {item.pt_type && item.pt_notes && <span className="text-orange-300">·</span>}
                              {item.pt_notes && <span>{item.pt_notes}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ); })()}

              {/* Side Events */}
              {sideEventItems.length > 0 && (() => { const n = nextSection(); return (
                <div className="rounded-xl border border-purple-200 bg-white shadow-sm">
                  <div className="p-5 pb-3">
                    <SectionLabel num={n} icon={CalendarDays} title="Side Events" />
                  </div>
                  <div className="divide-y divide-purple-100">
                    {sideEventItems.map((item) => (
                      <div key={item.id} className="flex gap-3 px-5 py-3">
                        {item.time && (
                          <span className="shrink-0 font-mono text-sm font-bold text-purple-700 w-14">{item.time}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{item.activity}</p>
                          {item.location && (
                            <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                              <MapPin className="h-3 w-3" />{item.location}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ); })()}

              {/* Watch Bill */}
              {pod?.watch_bill && (() => { const n = nextSection(); return (
                <div className="rounded-xl border bg-white p-5 shadow-sm">
                  <SectionLabel num={n} icon={Shield} title="Watch Bill" />
                  <pre className="mt-3 whitespace-pre-wrap font-mono text-sm text-gray-700 leading-relaxed">{pod.watch_bill}</pre>
                </div>
              ); })()}

              {/* Notes */}
              {pod?.notes && (() => { const n = nextSection(); return (
                <div className="rounded-xl border bg-white p-5 shadow-sm">
                  <SectionLabel num={n} icon={FileText} title="Additional Orders / Notes" />
                  <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">{pod.notes}</p>
                </div>
              ); })()}

              {/* Print footer */}
              <div className="hidden print:block mt-8 border-t border-black pt-3 text-xs text-center text-gray-600">
                <p>This is an official document of {unitName}. Prepared {format(new Date(), "d MMMM yyyy HHmm")}Z.</p>
                {pod?.approved_by_name && (
                  <p className="mt-1">Approved by: {pod.approved_by_name}</p>
                )}
              </div>
            </div>
          )
        )}

        {/* ════════════════════════════════════════════════════════════════
            EDIT MODE
        ════════════════════════════════════════════════════════════════ */}
        {!loading && editing && (
          <div className="space-y-5">
            {/* Templates notice */}
            {templates.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
                <BookOpen className="h-4 w-4 shrink-0" />
                You have {templates.length} template{templates.length !== 1 ? "s" : ""} saved. Use &ldquo;Load Template&rdquo; above to start from one.
              </div>
            )}

            {/* Section: Officer in Charge */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <SectionLabel num={1} icon={User} title="Officer in Charge" />
              </div>
              <div className="p-5">
                <SearchableSelect
                  value={officerInChargeId}
                  onChange={handleOicChange}
                  placeholder="— Select Officer in Charge —"
                  className="w-full max-w-sm"
                  options={allProfiles
                    .filter((p) => p.role === "officer" || p.role === "snco")
                    .map((p) => ({ value: p.id, label: `${p.rank ? p.rank + " " : ""}${p.full_name}` }))}
                />
                {officerInChargeName && (
                  <p className="mt-2 text-sm font-semibold text-[#003087]">{officerInChargeName}</p>
                )}
              </div>
            </div>

            {/* Section: Training Objective */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <SectionLabel num={2} icon={Target} title="Training Objective" />
              </div>
              <div className="p-5">
                <textarea
                  value={trainingObjective}
                  onChange={(e) => setTrainingObjective(e.target.value)}
                  placeholder="What will cadets learn or accomplish today? e.g. Cadets will demonstrate proper small boat seamanship and pass the NSCC basic knot qualification."
                  rows={3}
                  className="w-full resize-y rounded-lg border bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
                />
              </div>
            </div>

            {/* Section: Uniform of the Day */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <SectionLabel num={3} icon={Shirt} title="Uniform of the Day" />
              </div>
              <div className="p-5">
                <div className="relative">
                  <input
                    value={uniformOfDay}
                    onChange={(e) => setUniformOfDay(e.target.value)}
                    placeholder="e.g. NWU Type III (Blueberries)"
                    className="w-full rounded-lg border px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
                  />
                  <button
                    onClick={() => setShowUniformPresets((v) => !v)}
                    className="absolute right-2 top-2 rounded p-0.5 text-gray-400 hover:text-gray-600"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {showUniformPresets && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border bg-white shadow-lg">
                      {UNIFORM_PRESETS.map((u) => (
                        <button
                          key={u}
                          onClick={() => { setUniformOfDay(u); setShowUniformPresets(false); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          <CheckCircle2 className={`h-4 w-4 ${uniformOfDay === u ? "text-[#003087]" : "text-transparent"}`} />
                          {u}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section: Special Events / Announcements */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <SectionLabel num={4} icon={Megaphone} title="Special Events / Announcements" />
              </div>
              <div className="p-5">
                <textarea
                  value={specialEvents}
                  onChange={(e) => setSpecialEvents(e.target.value)}
                  placeholder="Promotions, awards, command announcements, parent/guest information, upcoming training events…"
                  rows={3}
                  className="w-full resize-y rounded-lg border bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
                />
              </div>
            </div>

            {/* Section: Safety Brief */}
            <div className="rounded-xl border border-amber-200/60 bg-white shadow-sm">
              <div className="border-b border-amber-200/60 px-5 py-4">
                <SectionLabel num={5} icon={AlertTriangle} title="Safety Brief" />
              </div>
              <div className="p-5">
                <textarea
                  value={safetyBrief}
                  onChange={(e) => setSafetyBrief(e.target.value)}
                  placeholder="Safety considerations, hazards, emergency procedures, or required safety reminders for today's evolutions…"
                  rows={3}
                  className="w-full resize-y rounded-lg border bg-amber-50/50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                />
              </div>
            </div>

            {/* Section: Schedule of Events */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <SectionLabel num={6} icon={Clock} title="Schedule of Events" />
              </div>
              <div className="p-5 space-y-3">
                {/* Column headers */}
                <div className="hidden grid-cols-[80px_1fr_140px_130px_140px_40px] gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400 sm:grid">
                  <span>Time</span>
                  <span>Evolution / Activity</span>
                  <span>Location</span>
                  <span>Category</span>
                  <span>Responsible</span>
                  <span />
                </div>

                {items.map((item, idx) => (
                  <div key={item.id} className="space-y-1.5">
                  <div className="flex flex-col gap-2 rounded-lg border bg-gray-50/60 p-3 sm:flex-row sm:items-center sm:bg-transparent sm:border-0 sm:p-0">
                    {/* Time */}
                    <input
                      type="text"
                      placeholder="0800"
                      value={item.time}
                      onChange={(e) => updateItem(item.id, "time", e.target.value)}
                      className="w-20 rounded-md border bg-white px-2 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
                    />
                    {/* Activity */}
                    <input
                      type="text"
                      placeholder="Evolution / Activity"
                      value={item.activity}
                      onChange={(e) => updateItem(item.id, "activity", e.target.value)}
                      className="flex-1 rounded-md border bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
                    />
                    {/* Location */}
                    <input
                      type="text"
                      placeholder="Location"
                      value={item.location}
                      onChange={(e) => updateItem(item.id, "location", e.target.value)}
                      className="w-full rounded-md border bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30 sm:w-36"
                    />
                    {/* Category */}
                    <select
                      value={item.category}
                      onChange={(e) => updateItem(item.id, "category", e.target.value)}
                      className="w-full rounded-md border bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30 sm:w-36"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    {/* Responsible party */}
                    <select
                      value={item.responsible_id ?? ""}
                      onChange={(e) => updateItem(item.id, "responsible_id", e.target.value)}
                      className="w-full rounded-md border bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30 sm:w-44"
                    >
                      <option value="">— Responsible —</option>
                      {allProfiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.rank ? `${p.rank} ` : ""}{p.full_name}
                        </option>
                      ))}
                    </select>
                    {/* Actions */}
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => moveItem(item.id, -1)}
                        disabled={idx === 0}
                        className="flex h-8 w-8 items-center justify-center rounded text-gray-300 hover:bg-gray-100 hover:text-gray-500 disabled:opacity-20"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 rotate-90" />
                      </button>
                      <button
                        onClick={() => moveItem(item.id, 1)}
                        disabled={idx === items.length - 1}
                        className="flex h-8 w-8 items-center justify-center rounded text-gray-300 hover:bg-gray-100 hover:text-gray-500 disabled:opacity-20"
                      >
                        <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="flex h-8 w-8 items-center justify-center rounded text-gray-300 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {/* PT planning row — only when category is PT */}
                  {item.category === "pt" && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-orange-500 shrink-0">PT Plan (staff only)</span>
                      <select
                        value={item.pt_type ?? ""}
                        onChange={(e) => updateItem(item.id, "pt_type", e.target.value)}
                        className="rounded-md border border-orange-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300"
                      >
                        <option value="">— Type of PT —</option>
                        <option value="Run">Run</option>
                        <option value="PRT">PRT (Physical Readiness Test)</option>
                        <option value="Calisthenics">Calisthenics / Bodyweight</option>
                        <option value="Strength Training">Strength Training</option>
                        <option value="Swim">Swim</option>
                        <option value="Obstacle Course">Obstacle Course</option>
                        <option value="Sports">Sports / Competition</option>
                        <option value="Unit PT">Unit PT (Custom)</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Details — e.g. 3-mile run, 25 min; 3×20 pushups/situps…"
                        value={item.pt_notes ?? ""}
                        onChange={(e) => updateItem(item.id, "pt_notes", e.target.value)}
                        className="flex-1 min-w-48 rounded-md border border-orange-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </div>
                  )}
                  </div>
                ))}

                {/* LRP quick-add: blocks scheduled for this date */}
                {canEdit && (lrpByDate[date] ?? []).length > 0 && (
                  <div className="mb-3 rounded-lg border border-purple-200 bg-purple-50 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-700">From Long Range Plan</p>
                    <div className="flex flex-wrap gap-2">
                      {(lrpByDate[date] ?? []).map((block) => {
                        const alreadyAdded = items.some((i) => i.activity === block.topic);
                        const typeColors: Record<string, string> = {
                          phase: "bg-[#003087]/10 text-[#003087] border-[#003087]/20",
                          major_event: "bg-purple-100 text-purple-700 border-purple-200",
                          minor_event: "bg-teal-100 text-teal-700 border-teal-200",
                          prt: "bg-red-100 text-red-700 border-red-200",
                          custom: "bg-gray-100 text-gray-600 border-gray-200",
                        };
                        const color = typeColors[block.block_type] ?? typeColors.custom;
                        const blockTypeLabels: Record<string, string> = {
                          phase: "Phase",
                          major_event: "Major Event",
                          minor_event: "Minor Event",
                          prt: "PRT",
                          custom: "Custom",
                        };
                        const typeLabel = blockTypeLabels[block.block_type] ?? block.block_type;
                        return (
                          <div key={block.id} className="group relative">
                            <button
                              disabled={alreadyAdded}
                              onClick={() => {
                                if (!alreadyAdded) {
                                  setItems((prev) => [...prev, { ...blankItem(), activity: block.topic, category: block.block_type === "prt" ? "training" : block.block_type === "phase" ? "training" : "general" }]);
                                }
                              }}
                              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-opacity ${color} ${alreadyAdded ? "opacity-40 cursor-default" : "hover:opacity-80 cursor-pointer"}`}
                            >
                              {!alreadyAdded && <Plus className="h-3 w-3" />}
                              <span>{block.topic}</span>
                              <span className="ml-1 opacity-60">· {typeLabel}</span>
                            </button>
                            {block.description && (
                              <div className="absolute bottom-full left-0 z-10 mb-1 hidden w-48 rounded-lg border bg-white p-2 text-xs text-gray-600 shadow-lg group-hover:block">
                                {block.description}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  onClick={addItem}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#003087]/30 py-3 text-sm font-medium text-[#003087]/60 transition-colors hover:bg-[#003087]/5 hover:text-[#003087]"
                >
                  <Plus className="h-4 w-4" /> Add Evolution
                </button>
              </div>
            </div>

            {/* Section: Side Events */}
            <div className="rounded-xl border border-purple-200 bg-white shadow-sm">
              <div className="border-b border-purple-200 px-5 py-4">
                <SectionLabel num={7} icon={CalendarDays} title="Side Events" />
              </div>
              <div className="p-5 space-y-3">
                <p className="text-xs text-gray-400">Promotions, ceremonies, guest speakers, award presentations, or anything happening alongside the main schedule.</p>
                {items.filter((i) => i.category === "side_event").map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-purple-100 bg-purple-50/40 p-3 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      placeholder="Time (opt)"
                      value={item.time}
                      onChange={(e) => updateItem(item.id, "time", e.target.value)}
                      className="w-20 rounded-md border bg-white px-2 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-300/50"
                    />
                    <input
                      type="text"
                      placeholder="Event title / description"
                      value={item.activity}
                      onChange={(e) => updateItem(item.id, "activity", e.target.value)}
                      className="flex-1 rounded-md border bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300/50"
                    />
                    <input
                      type="text"
                      placeholder="Location (opt)"
                      value={item.location}
                      onChange={(e) => updateItem(item.id, "location", e.target.value)}
                      className="w-full rounded-md border bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300/50 sm:w-36"
                    />
                    <button
                      onClick={() => removeItem(item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded text-gray-300 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setItems((prev) => [...prev, blankSideEvent()])}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-purple-300/50 py-3 text-sm font-medium text-purple-600/70 transition-colors hover:bg-purple-50 hover:text-purple-700"
                >
                  <Plus className="h-4 w-4" /> Add Side Event
                </button>
              </div>
            </div>

            {/* Section: Watch Bill */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <SectionLabel num={8} icon={Shield} title="Watch Bill" />
              </div>
              <div className="p-5">
                <textarea
                  value={watchBill}
                  onChange={(e) => setWatchBill(e.target.value)}
                  placeholder={"OOD: \nJOOD: \nMAA: \nQDW: \nBO: "}
                  rows={6}
                  className="w-full resize-y rounded-lg border bg-gray-50 px-3 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
                />
                <p className="mt-1.5 text-xs text-gray-400">Free-form. Use any format you prefer — the text will display exactly as entered.</p>
              </div>
            </div>

            {/* Section: Notes */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <SectionLabel num={9} icon={FileText} title="Additional Orders / Notes" />
              </div>
              <div className="p-5">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special orders, reminders, Thought of the Day…"
                  rows={5}
                  className="w-full resize-y rounded-lg border bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
                />
              </div>
            </div>

            {/* Category legend */}
            <div className="flex flex-wrap gap-3 text-xs">
              {CATEGORIES.map((c) => (
                <span key={c.value} className="flex items-center gap-1.5 text-gray-500">
                  <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showLoadModal && (
        <TemplateModal templates={templates} onLoad={loadTemplate} onClose={() => setShowLoadModal(false)} />
      )}
      {showSaveModal && (
        <SaveTemplateModal onSave={saveTemplate} onClose={() => setShowSaveModal(false)} />
      )}
      {showRejectModal && (
        <RejectModal onReject={handleReject} onClose={() => setShowRejectModal(false)} />
      )}
    </>
  );
}
