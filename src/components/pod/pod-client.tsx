"use client";

import { useState, useCallback, useRef } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlanOfDay, PodItem, PodCategory, PodTemplate } from "@/types/database";

// ─── Types ──────────────────────────────────────────────────────────────────

type ProfileSnippet = {
  id: string;
  full_name: string;
  rank: string | null;
  role: string;
};

const CATEGORIES: { value: PodCategory; label: string; dot: string }[] = [
  { value: "formation", label: "Formation", dot: "bg-[#003087]" },
  { value: "training", label: "Training", dot: "bg-blue-500" },
  { value: "meal", label: "Meal", dot: "bg-green-500" },
  { value: "admin", label: "Admin", dot: "bg-amber-500" },
  { value: "general", label: "General", dot: "bg-gray-400" },
];

const CAT_COLORS: Record<PodCategory, string> = {
  formation: "border-[#003087] bg-[#003087]/5 text-[#003087]",
  training: "border-blue-300 bg-blue-50 text-blue-700",
  meal: "border-green-300 bg-green-50 text-green-700",
  admin: "border-amber-300 bg-amber-50 text-amber-700",
  general: "border-gray-200 bg-gray-50 text-gray-600",
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

// ─── Main Component ──────────────────────────────────────────────────────────

export function PodClient({
  initialPod,
  initialDate,
  canEdit,
  allProfiles,
  initialTemplates,
  unitName,
  motto,
  initialAllDates,
}: {
  initialPod: PlanOfDay | null;
  initialDate: string;
  canEdit: boolean;
  allProfiles: ProfileSnippet[];
  initialTemplates: PodTemplate[];
  unitName: string;
  motto: string;
  initialAllDates: string[];
}) {
  const [date, setDate] = useState(initialDate);
  const [pod, setPod] = useState<PlanOfDay | null>(initialPod);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<PodTemplate[]>(initialTemplates);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [allDates, setAllDates] = useState<string[]>(initialAllDates);
  const [showNewDrillPicker, setShowNewDrillPicker] = useState(false);
  const [newDrillDate, setNewDrillDate] = useState("");

  // Edit state
  const [uniformOfDay, setUniformOfDay] = useState(initialPod?.uniform_of_day ?? "");
  const [watchBill, setWatchBill] = useState(initialPod?.watch_bill ?? "");
  const [items, setItems] = useState<PodItem[]>(initialPod?.items ?? []);
  const [notes, setNotes] = useState(initialPod?.notes ?? "");
  const [showUniformPresets, setShowUniformPresets] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadDate = useCallback(async (d: string) => {
    setLoading(true);
    setEditing(false);
    const supabase = createClient();
    const { data } = await supabase.from("plan_of_day").select("*").eq("date", d).maybeSingle();
    setPod(data ?? null);
    setItems(data?.items ?? []);
    setUniformOfDay(data?.uniform_of_day ?? "");
    setWatchBill(data?.watch_bill ?? "");
    setNotes(data?.notes ?? "");
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
      items: cleanItems,
      notes: notes.trim() || null,
      updated_by: me?.id ?? null,
      updated_at: new Date().toISOString(),
    };

    let res;
    if (pod) {
      res = await supabase.from("plan_of_day").update(payload).eq("id", pod.id).select().single();
    } else {
      res = await supabase.from("plan_of_day").insert({ ...payload, created_by: me?.id ?? null }).select().single();
    }

    if (res.error) {
      toast.error("Failed to save POD");
    } else {
      setPod(res.data as PlanOfDay);
      toast.success("Plan of the Day saved");
      setEditing(false);
      if (!pod) {
        setAllDates((prev) => [...prev, date].sort());
      }
    }
    setSaving(false);
  };

  // ── Templates ─────────────────────────────────────────────────────────────

  const loadTemplate = (t: PodTemplate) => {
    setItems((t.items ?? []).map((i) => ({ ...i, id: generateId() })));
    if (t.uniform_of_day) setUniformOfDay(t.uniform_of_day);
    if (t.watch_bill) setWatchBill(t.watch_bill);
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
    setItems((data.items ?? []).map((i: PodItem) => ({ ...i, id: generateId() })));
    if (data.uniform_of_day) setUniformOfDay(data.uniform_of_day);
    if (data.watch_bill) setWatchBill(data.watch_bill);
    if (data.notes) setNotes(data.notes);
    toast.success("Copied from previous day");
  };

  // ── Print ─────────────────────────────────────────────────────────────────

  const handlePrint = () => window.print();

  const cancelEdit = () => {
    setItems(pod?.items ?? []);
    setUniformOfDay(pod?.uniform_of_day ?? "");
    setWatchBill(pod?.watch_bill ?? "");
    setNotes(pod?.notes ?? "");
    setEditing(false);
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const displayDate = parseISO(date);
  const todayStr = new Date().toISOString().split("T")[0];
  const isToday = date === todayStr;
  const sortedItems = [...(editing ? items : (pod?.items ?? []))].sort((a, b) => a.time.localeCompare(b.time));
  const hasContent = (pod?.items?.length ?? 0) > 0 || pod?.uniform_of_day || pod?.watch_bill || pod?.notes;

  return (
    <>
      {/* Print styles injected into head */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLE }} />

      <div className="mx-auto max-w-4xl space-y-5">
        {/* ── Top bar ── */}
        <div className="print-hide flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-[#003087]">Plan of the Day</h1>
            <p className="text-sm text-gray-500">Daily operational schedule for {unitName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!editing && hasContent && (
              <Button variant="outline" onClick={handlePrint} className="gap-2 print-hide">
                <Printer className="h-4 w-4" /> Print / PDF
              </Button>
            )}
            {canEdit && !editing && (
              <Button onClick={() => setEditing(true)} className="gap-2 bg-[#003087] hover:bg-[#002266]">
                <Pencil className="h-4 w-4" />
                {pod ? "Edit POD" : "Create POD"}
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

              {/* Section 1: Uniform of the Day */}
              {pod?.uniform_of_day && (
                <div className="rounded-xl border bg-white p-5 shadow-sm">
                  <SectionLabel num={1} icon={Shirt} title="Uniform of the Day" />
                  <p className="mt-3 text-lg font-semibold text-gray-800">{pod.uniform_of_day}</p>
                </div>
              )}

              {/* Section 2: Schedule of Events */}
              {(pod?.items?.length ?? 0) > 0 && (
                <div className="rounded-xl border bg-white shadow-sm">
                  <div className="p-5 pb-3">
                    <SectionLabel num={pod?.uniform_of_day ? 2 : 1} icon={Clock} title="Schedule of Events" />
                  </div>
                  <div className="divide-y">
                    {sortedItems.map((item, idx) => (
                      <div key={item.id} className={`flex gap-4 px-5 py-4 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                        {/* Time column */}
                        <div className="w-16 shrink-0 text-center">
                          <span className="font-mono text-base font-bold text-[#003087]">{item.time}</span>
                        </div>
                        {/* Dot */}
                        <div className="flex flex-col items-center">
                          <div className={`mt-1.5 h-3 w-3 rounded-full ${CATEGORIES.find(c => c.value === item.category)?.dot ?? "bg-gray-300"}`} />
                          {idx < sortedItems.length - 1 && <div className="mt-1 flex-1 w-px bg-gray-200" />}
                        </div>
                        {/* Content */}
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
                            {item.responsible_name && (
                              <span className="flex items-center gap-1">
                                <Shield className="h-3.5 w-3.5 text-[#B8860B]" />
                                <span className="font-medium text-[#003087]">{item.responsible_name}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 3: Watch Bill */}
              {pod?.watch_bill && (
                <div className="rounded-xl border bg-white p-5 shadow-sm">
                  <SectionLabel
                    num={(pod?.uniform_of_day ? 1 : 0) + ((pod?.items?.length ?? 0) > 0 ? 1 : 0) + 1}
                    icon={Shield}
                    title="Watch Bill"
                  />
                  <pre className="mt-3 whitespace-pre-wrap font-mono text-sm text-gray-700 leading-relaxed">{pod.watch_bill}</pre>
                </div>
              )}

              {/* Section 4: Notes */}
              {pod?.notes && (
                <div className="rounded-xl border bg-white p-5 shadow-sm">
                  <SectionLabel
                    num={(pod?.uniform_of_day ? 1 : 0) + ((pod?.items?.length ?? 0) > 0 ? 1 : 0) + (pod?.watch_bill ? 1 : 0) + 1}
                    icon={FileText}
                    title="Additional Orders / Notes"
                  />
                  <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">{pod.notes}</p>
                </div>
              )}

              {/* Print footer */}
              <div className="hidden print:block mt-8 border-t border-black pt-3 text-xs text-center text-gray-600">
                <p>This is an official document of {unitName}. Prepared {format(new Date(), "d MMMM yyyy HHmm")}Z.</p>
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

            {/* Section 1: Uniform of the Day */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <SectionLabel num={1} icon={Shirt} title="Uniform of the Day" />
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

            {/* Section 2: Schedule of Events */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <SectionLabel num={2} icon={Clock} title="Schedule of Events" />
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
                  <div key={item.id} className="flex flex-col gap-2 rounded-lg border bg-gray-50/60 p-3 sm:flex-row sm:items-center sm:bg-transparent sm:border-0 sm:p-0">
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
                ))}

                <button
                  onClick={addItem}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#003087]/30 py-3 text-sm font-medium text-[#003087]/60 transition-colors hover:bg-[#003087]/5 hover:text-[#003087]"
                >
                  <Plus className="h-4 w-4" /> Add Evolution
                </button>
              </div>
            </div>

            {/* Section 3: Watch Bill */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <SectionLabel num={3} icon={Shield} title="Watch Bill" />
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

            {/* Section 4: Notes */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <SectionLabel num={4} icon={FileText} title="Additional Orders / Notes" />
              </div>
              <div className="p-5">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special orders, safety information, reminders, Thought of the Day…"
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
    </>
  );
}
