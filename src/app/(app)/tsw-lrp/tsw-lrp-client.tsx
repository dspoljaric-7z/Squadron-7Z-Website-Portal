"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Plus, Trash2, CalendarDays, X } from "lucide-react";
import { HintButton } from "@/components/shared/hint-button";

const TSW_LRP_HINTS = [
  { heading: "Adding a date", body: "Click 'Add Date' and enter the TSW meeting date, theme (e.g. Navigation, Leadership), and status. Dates appear in chronological order." },
  { heading: "Training phases", body: "TSW uses L-1 (basic), L-2 (intermediate), and L-3 (advanced) phases. Indicate the phase in the theme or notes field." },
  { heading: "TSW LRP on the calendar", body: "Purple pills on the Training Schedule calendar come from this page. Update the theme here to update the calendar label." },
  { heading: "Deleting a date", body: "Expand a date row and click the trash icon to remove it. This also removes it from the calendar view." },
];
import { toast } from "sonner";
import { format, parseISO, getYear, getMonth } from "date-fns";
import type { Profile } from "@/types/database";

type PlanStatus = "planned" | "confirmed" | "completed";

type PlanRow = {
  id: string;
  date: string;
  theme: string;
  notes: string;
  status: PlanStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type BlockType = "phase" | "major_event" | "minor_event" | "prt" | "custom";

type PlanBlock = {
  id: string;
  plan_id: string;
  phase: 1 | 2 | 3 | null;
  block_type: BlockType;
  topic: string;
  sort_order: number;
  created_by: string | null;
  created_at: string;
};

const EVENT_SLOTS: { type: BlockType; label: string; placeholder: string; color: string }[] = [
  { type: "major_event", label: "Major Event",  placeholder: "e.g. Color Guard Competition, DAV 5K",      color: "bg-purple-50 border-purple-200 text-purple-800" },
  { type: "minor_event", label: "Minor Event",  placeholder: "e.g. Community Service, Recruiting Table",  color: "bg-teal-50 border-teal-200 text-teal-800" },
  { type: "prt",         label: "PT",           placeholder: "e.g. 1.5mi run, Push-ups, Sit-ups",         color: "bg-red-50 border-red-200 text-red-800" },
];

const STATUS_NEXT: Record<PlanStatus, PlanStatus> = {
  planned: "confirmed",
  confirmed: "completed",
  completed: "planned",
};

const STATUS_LABEL: Record<PlanStatus, string> = {
  planned: "Planned",
  confirmed: "Confirmed",
  completed: "Completed",
};

const STATUS_CLASS: Record<PlanStatus, string> = {
  planned:   "bg-gray-100 text-gray-600 border-gray-200",
  confirmed: "bg-[#B8860B]/15 text-[#B8860B] border-[#B8860B]/30",
  completed: "bg-green-100 text-green-700 border-green-200",
};

// League Cadet phases
const PHASE_LABEL: Record<1 | 2 | 3, string> = {
  1: "L-1 – Military Foundations (RC → ABC)",
  2: "L-2 – Intermediate Skills (ABC → PO2)",
  3: "L-3 – Leadership Readiness (PO2 → SLPO)",
};

const PHASE_COLOR: Record<1 | 2 | 3, string> = {
  1: "bg-blue-50 border-blue-200 text-blue-800",
  2: "bg-amber-50 border-amber-200 text-amber-800",
  3: "bg-[#003087]/[0.06] border-[#003087]/20 text-[#003087]",
};

const PHASE_BADGE: Record<1 | 2 | 3, string> = {
  1: "bg-blue-100 text-blue-700",
  2: "bg-amber-100 text-amber-700",
  3: "bg-[#003087]/10 text-[#003087]",
};

// League Cadet curriculum topics
const PHASE_TOPICS: Record<1 | 2 | 3, string[]> = {
  1: [
    // Military Foundations
    "Customs & Courtesies",
    "Rank & Rate Recognition (Navy/League)",
    "Chain of Command",
    "Drill Basics (Positions, Marching, Facing)",
    "Uniform Wear & Personal Appearance",
    "Basic Watchstanding & Quarterdeck Etiquette",
    "Military Bearing",
    // Program Values & Knowledge
    "League Cadet Core Values",
    "League Cadet Oath",
    "General Orders (First 5)",
    "Program History & Mission",
    "Anchors Aweigh",
    // Safety & Conduct
    "Hazing/Bullying/Fraternization Prevention",
    "ORM Basics",
    "Cold/Heat Weather Safety",
    "Situational Awareness",
    "Travel & Overnight Safety",
    "Code of Conduct Introduction",
    "THINK Procedure",
    // Seamanship & Maritime Basics
    "Knots & Line Handling",
    "Parts of a Ship",
    "Deck Seamanship Terminology",
    "Basic Navigation (Compass, Bearings)",
    "Weather, Tides & Currents",
    "Navy Platforms Overview",
    // Personal Responsibility
    "Maintaining Gear",
    "Standing Ready for Inspections",
    "Timeliness & Reporting",
    "Corrective Training",
  ],
  2: [
    // Intermediate Military Skills
    "Command Voice",
    "Drill at Squad → Division Level",
    "Color Guard Qualification",
    "Uniform Inspection Mastery",
    "Gear & People Accountability",
    // Program Values (Expanded)
    "All 11 General Orders – Memorized",
    "Code of Conduct – Scenario-Based",
    "Core Values in Leadership",
    "Sea Cadet/League History",
    "Anchors Aweigh – Lead Unit",
    // Team Leadership Foundations
    "Authority vs Earned Influence",
    "Leading a Fire Team",
    "Giving Clear Commands",
    "Correcting Peers Respectfully",
    "Enforcing Standards",
    "Teaching L-1 Skills",
    "Writing Accountability Reports",
    // Operational & Safety Skills
    "Damage Control I",
    "First Aid / CPR / Bleeding Control",
    "Radio Communications Basics",
    "Land Navigation (Compass, Pace Count)",
    "Navigation Plotting",
    "Signal Decoding (Flags/Lights/Morse)",
    "Intro to SAR Principles",
    // STEM & Exploration
    "Environmental Science (Tides, Currents)",
    "Marine Weather Interpretation",
    "Squad Accountability Reports",
    "Pre/Post Meeting Check-ins",
    "After-Action Reviews",
    "1:1 Mentorship with L-1 Cadets",
  ],
  3: [
    // Leadership Readiness
    "Leading a Division",
    "Supervising Junior Leaders",
    "Planning Meeting Days",
    "Running Inspections",
    "Writing Lesson Plans",
    "Cadet Evaluations",
    "Mentoring Difficult Cadets",
    "Professional Communication with Adults",
    // Advanced Program Knowledge
    "Teaching Core Values, Oath, General Orders",
    "Historical Context of League Cadet Program",
    "Anchors Aweigh – Lead & Teach History",
    "Ethics & Leadership – Disciplinary Scenarios",
    "Code of Conduct Case Studies",
    // Operational Skills
    "Division Accountability",
    "Mustering and Reporting",
    "Safety Briefs",
    "ORM Leadership",
    "Managing Equipment/Supplies",
    "Coordinating Ceremonial Events",
    // STEM & Maritime Operations
    "Damage Control II",
    "Emergency Medical Planning",
    "Maritime Operations SAR Leadership",
    "Cold-Weather Operations",
    "Water Safety Leadership",
    "Navigation Scenario Plotting",
    "Environmental Assessments",
    "Tide/Current Modeling",
    "Boat Design/Mission Planning",
    // Mentorship
    "Instructor Development",
    "Public Speaking",
    "Classroom Management",
    "Multi-Age Instruction",
    "Running Entire Meeting Blocks",
  ],
};

// L-1 billets
const PHASE_BILLETS: Record<1 | 2 | 3, string[]> = {
  1: [
    "Guide-On Bearer",
    "Color Guard (Entry)",
    "Corpsman (L-1)",
    "Gear Accountability Aide",
    "Morning/Muster Runner",
  ],
  2: [
    "Squad Leader",
    "Division Petty Officer",
    "Yeoman",
    "Education PO",
    "Safety PO",
    "Fitness PO",
    "Color Guard Member",
    "Supply Helper",
    "Muster Lead",
    "AMAA",
    "Corpsman (L-2)",
  ],
  3: [
    "ALPO (League)",
    "Division PO (League)",
    "Color Guard Lead",
    "Safety PO (Senior)",
    "Supply PO",
    "Training Assistant",
  ],
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function drillLabel(dateStr: string) {
  const d = parseISO(dateStr);
  return format(d, "MMM d");
}

// ─── EventSlot component ──────────────────────────────────────────────────────

function EventSlot({
  slot,
  planId,
  blocks,
  isOfficer,
  onAddBlock,
  onRemoveBlock,
}: {
  slot: typeof EVENT_SLOTS[number];
  planId: string;
  blocks: PlanBlock[];
  isOfficer: boolean;
  onAddBlock: (planId: string, phase: 1 | 2 | 3 | null, topic: string, blockType?: BlockType) => void;
  onRemoveBlock: (blockId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  const save = () => {
    const t = text.trim();
    if (!t) return;
    onAddBlock(planId, null, t, slot.type);
    setText("");
    setEditing(false);
  };

  return (
    <div className={`rounded-lg border p-3 ${slot.color}`}>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 opacity-70">{slot.label}</p>
      {blocks.map((b) => (
        <div key={b.id} className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs">{b.topic}</span>
          {isOfficer && (
            <button onClick={() => onRemoveBlock(b.id)} className="opacity-50 hover:opacity-100">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      {isOfficer && (
        editing ? (
          <div className="flex gap-1 mt-2">
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
              placeholder={slot.placeholder}
              className="flex-1 rounded border bg-white/70 px-2 py-1 text-xs focus:outline-none"
            />
            <button onClick={save} className="rounded bg-white/70 px-2 py-1 text-xs font-medium hover:bg-white">Add</button>
            <button onClick={() => setEditing(false)} className="text-xs opacity-60 hover:opacity-100 px-1">✕</button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="mt-1 flex items-center gap-1 text-[10px] opacity-60 hover:opacity-100"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        )
      )}
    </div>
  );
}

// ─── AddCustomEvent component ─────────────────────────────────────────────────

function AddCustomEvent({ onAdd }: { onAdd: (topic: string) => void }) {
  const [show, setShow] = useState(false);
  const [text, setText] = useState("");

  const save = () => {
    const t = text.trim();
    if (!t) return;
    onAdd(t);
    setText("");
    setShow(false);
  };

  return (
    <div className="mt-2">
      {show ? (
        <div className="flex gap-1">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setShow(false); }}
            placeholder="Custom event name…"
            className="flex-1 rounded border bg-gray-50 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#003087]/30"
          />
          <button onClick={save} className="rounded border bg-white px-2 py-1 text-xs font-medium hover:bg-gray-50">Add</button>
          <button onClick={() => setShow(false)} className="text-xs opacity-60 hover:opacity-100 px-1">✕</button>
        </div>
      ) : (
        <button
          onClick={() => setShow(true)}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-700"
        >
          <Plus className="h-3 w-3" /> Custom event
        </button>
      )}
    </div>
  );
}

// ─── PhaseBlock component ─────────────────────────────────────────────────────

function PhaseBlock({
  phase,
  planId,
  planBlocks,
  isOfficer,
  onAddBlock,
  onRemoveBlock,
}: {
  phase: 1 | 2 | 3;
  planId: string;
  planBlocks: PlanBlock[];
  isOfficer: boolean;
  onAddBlock: (planId: string, phase: 1 | 2 | 3 | null, topic: string, block_type?: BlockType) => void;
  onRemoveBlock: (blockId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const added = new Set(planBlocks.filter((b) => b.phase === phase).map((b) => b.topic));
  const suggestions = PHASE_TOPICS[phase].filter((t) => !added.has(t));

  return (
    <div className={`rounded-lg border p-3 ${PHASE_COLOR[phase]}`}>
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${PHASE_BADGE[phase]}`}>
          {phase === 1 ? "L-1" : phase === 2 ? "L-2" : "L-3"}
        </span>
        <span className="text-[11px] font-medium opacity-70">{PHASE_LABEL[phase]}</span>
      </div>
      {planBlocks.filter((b) => b.phase === phase).map((b) => (
        <div key={b.id} className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-xs">{b.topic}</span>
          {isOfficer && (
            <button onClick={() => onRemoveBlock(b.id)} className="shrink-0 opacity-40 hover:opacity-100">
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      {isOfficer && suggestions.length > 0 && (
        <>
          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-2 flex items-center gap-1 text-[10px] opacity-60 hover:opacity-100"
          >
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {open ? "Hide suggestions" : `Add topic (${suggestions.length})`}
          </button>
          {open && (
            <div className="mt-2 flex flex-wrap gap-1">
              {suggestions.map((t) => (
                <button
                  key={t}
                  onClick={() => onAddBlock(planId, phase, t, "phase")}
                  className="rounded-full border bg-white/60 px-2 py-0.5 text-[10px] hover:bg-white"
                >
                  + {t}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {/* Billets reference */}
      <details className="mt-2">
        <summary className="text-[10px] opacity-50 cursor-pointer hover:opacity-80">Billets for this phase</summary>
        <div className="mt-1 flex flex-wrap gap-1">
          {PHASE_BILLETS[phase].map((b) => (
            <span key={b} className="rounded bg-white/50 px-1.5 py-0.5 text-[10px]">{b}</span>
          ))}
        </div>
      </details>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TswLongRangePlanClient({
  profile,
  initialRows,
  initialBlocks,
  dbError,
}: {
  profile: Profile;
  initialRows: PlanRow[];
  initialBlocks: PlanBlock[];
  dbError: string | null;
}) {
  const supabase = createClient();

  const isOfficer = profile.role === "officer" || profile.role === "snco" ||
    profile.is_lcpo === true ||
    [profile.billet, profile.billet_2, profile.billet_3].some(
      (b) => b?.toLowerCase().includes("ccpo") || b?.toLowerCase().includes("command chief")
    );

  const [rows, setRows] = useState<PlanRow[]>(initialRows);
  const [blocks, setBlocks] = useState<PlanBlock[]>(initialBlocks);
  const [showAddDate, setShowAddDate] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTheme, setNewTheme] = useState("");
  const [adding, setAdding] = useState(false);
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const now = new Date();
  const currentYear = getYear(now);
  const currentMonth = getMonth(now);

  const allYears = Array.from(new Set(rows.map((r) => getYear(parseISO(r.date))))).sort();
  // Always show currentYear through currentYear+4, plus any past years with data
  const futureYears = Array.from({ length: 5 }, (_, i) => currentYear + i);
  const years = Array.from(new Set([...allYears, ...futureYears])).sort();

  const [openYears, setOpenYears] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem("tsw-lrp-open-years");
      if (saved) return JSON.parse(saved) as Record<number, boolean>;
    } catch {}
    return { [currentYear]: true };
  });
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("tsw-lrp-open-months");
      if (saved) return JSON.parse(saved) as Record<string, boolean>;
    } catch {}
    return { [`${currentYear}-${currentMonth}`]: true };
  });

  const currentYearRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try { localStorage.setItem("tsw-lrp-open-years", JSON.stringify(openYears)); } catch {}
  }, [openYears]);

  useEffect(() => {
    try { localStorage.setItem("tsw-lrp-open-months", JSON.stringify(openMonths)); } catch {}
  }, [openMonths]);

  // Auto-scroll to current year on first load
  useEffect(() => {
    currentYearRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleYear = (y: number) => setOpenYears((p) => ({ ...p, [y]: !p[y] }));
  const toggleMonth = (key: string) => setOpenMonths((p) => ({ ...p, [key]: !p[key] }));
  const toggleExpand = (id: string) =>
    setExpandedRows((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const filteredRows = yearFilter === "all" ? rows : rows.filter((r) => getYear(parseISO(r.date)) === yearFilter);

  const grouped: Record<number, Record<number, PlanRow[]>> = {};
  filteredRows.forEach((r) => {
    const y = getYear(parseISO(r.date));
    const m = getMonth(parseISO(r.date));
    if (!grouped[y]) grouped[y] = {};
    if (!grouped[y][m]) grouped[y][m] = [];
    grouped[y][m].push(r);
  });

  const addPlan = async () => {
    if (!newDate) return;
    setAdding(true);
    const { data, error } = await supabase
      .from("tsw_long_range_plans" as never)
      .insert({ date: newDate, theme: newTheme, status: "planned", created_by: profile.id } as never)
      .select()
      .single();
    if (error) { toast.error(error.message); }
    else {
      setRows((prev) => [...prev, data as PlanRow].sort((a, b) => a.date.localeCompare(b.date)));
      const y = getYear(parseISO(newDate));
      const m = getMonth(parseISO(newDate));
      setOpenYears((p) => ({ ...p, [y]: true }));
      setOpenMonths((p) => ({ ...p, [`${y}-${m}`]: true }));
      // Keep tsw_meeting_sessions in sync so TSW POD can navigate to this date
      await supabase.from("tsw_meeting_sessions" as never).upsert({ date: newDate } as never, { onConflict: "date" });
    }
    setNewDate(""); setNewTheme(""); setShowAddDate(false); setAdding(false);
  };

  const deletePlan = async (id: string) => {
    const row = rows.find((r) => r.id === id);
    // Delete blocks first (FK child), then the plan and its meeting session
    await supabase.from("tsw_lrp_blocks" as never).delete().eq("plan_id", id);
    await supabase.from("tsw_long_range_plans" as never).delete().eq("id", id);
    // Remove from tsw_meeting_sessions so TSW POD no longer navigates to this date
    if (row) await supabase.from("tsw_meeting_sessions" as never).delete().eq("date", row.date);
    setRows((prev) => prev.filter((r) => r.id !== id));
    setBlocks((prev) => prev.filter((b) => b.plan_id !== id));
  };

  const cycleStatus = async (id: string, current: PlanStatus) => {
    const next = STATUS_NEXT[current];
    await supabase.from("tsw_long_range_plans" as never).update({ status: next } as never).eq("id", id);
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: next } : r));
  };

  const updateTheme = async (id: string, theme: string) => {
    await supabase.from("tsw_long_range_plans" as never).update({ theme } as never).eq("id", id);
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, theme } : r));
  };

  const updateNotes = async (id: string, notes: string) => {
    await supabase.from("tsw_long_range_plans" as never).update({ notes } as never).eq("id", id);
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, notes } : r));
  };

  const addBlock = async (planId: string, phase: 1 | 2 | 3 | null, topic: string, block_type: BlockType = "phase") => {
    const sortOrder = blocks.filter((b) => b.plan_id === planId).length;
    const { data, error } = await supabase
      .from("tsw_lrp_blocks" as never)
      .insert({ plan_id: planId, phase, topic, block_type, sort_order: sortOrder, created_by: profile.id } as never)
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setBlocks((prev) => [...prev, data as PlanBlock]);
  };

  const removeBlock = async (blockId: string) => {
    await supabase.from("tsw_lrp_blocks" as never).delete().eq("id", blockId);
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  if (dbError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p className="font-semibold mb-1">Database error</p>
        <p>{dbError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-[#003087]" />
          <h1 className="text-2xl font-bold text-[#003087]">TSW Long-Range Plan</h1>
          <HintButton title="TSW Long-Range Plan" hints={TSW_LRP_HINTS} />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={yearFilter === "all" ? "all" : String(yearFilter)}
            onChange={(e) => setYearFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700"
          >
            <option value="all">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}{y === currentYear ? " (current)" : ""}</option>)}
          </select>
          {isOfficer && (
            <Button size="sm" className="bg-[#003087] hover:bg-[#002266]" onClick={() => setShowAddDate((v) => !v)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Date
            </Button>
          )}
        </div>
      </div>

      {showAddDate && isOfficer && (
        <Card className="p-4 border-[#003087]/20 bg-[#003087]/[0.02]">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Meeting Date</label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-8 text-sm w-40" />
            </div>
            <div className="flex-1 min-w-40">
              <label className="text-xs font-semibold text-gray-600 block mb-1">Theme / Focus (optional)</label>
              <Input value={newTheme} onChange={(e) => setNewTheme(e.target.value)} placeholder="e.g. Safety & Seamanship" className="h-8 text-sm" />
            </div>
            <Button onClick={addPlan} disabled={!newDate || adding} size="sm">Add</Button>
            <Button onClick={() => setShowAddDate(false)} variant="ghost" size="sm">Cancel</Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {years.map((year) => {
          if (yearFilter !== "all" && yearFilter !== year) return null;
          const yearRows = grouped[year];
          const isOpen = openYears[year] ?? false;
          const totalInYear = Object.values(yearRows ?? {}).flat().length;
          const isCurrent = year === currentYear;
          const isFuture = year > currentYear;
          return (
            <div key={year} ref={isCurrent ? currentYearRef : undefined}>
              <Card className="overflow-hidden">
                <button
                  onClick={() => toggleYear(year)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#003087] text-white hover:bg-[#002266] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-semibold">{year}</span>
                    {isCurrent && <Badge className="bg-white/20 text-white text-[10px] border-0">Current</Badge>}
                    {isFuture && !totalInYear && <Badge className="bg-white/10 text-white/70 text-[10px] border-0">Future</Badge>}
                  </div>
                  <span className="text-sm text-white/70">{totalInYear ? `${totalInYear} meeting${totalInYear !== 1 ? "s" : ""}` : "No meetings yet"}</span>
                </button>

                {isOpen && (
                  <div className="divide-y">
                    {totalInYear === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <CalendarDays className="h-6 w-6 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No meetings planned for {year}.</p>
                        {isOfficer && (
                          <button
                            onClick={() => { setNewDate(`${year}-01-01`); setShowAddDate(true); }}
                            className="mt-2 text-xs text-[#003087] hover:underline"
                          >
                            + Add first meeting
                          </button>
                        )}
                      </div>
                    ) : (
                      MONTHS.map((monthName, monthIdx) => {
                        const monthRows = yearRows?.[monthIdx];
                        if (!monthRows?.length) return null;
                        const monthKey = `${year}-${monthIdx}`;
                        const isMonthOpen = openMonths[monthKey] ?? false;
                        return (
                          <div key={monthIdx}>
                            <button
                              onClick={() => toggleMonth(monthKey)}
                              className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {isMonthOpen ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                                <span className="text-sm font-medium text-gray-700">{monthName}</span>
                              </div>
                              <span className="text-xs text-gray-400">{monthRows.length} meeting{monthRows.length !== 1 ? "s" : ""}</span>
                            </button>

                            {isMonthOpen && (
                              <div className="divide-y">
                                {monthRows.map((row) => (
                                  <TswDrillRowItem
                                    key={row.id}
                                    row={row}
                                    isOfficer={isOfficer}
                                    blocks={blocks.filter((b) => b.plan_id === row.id)}
                                    isExpanded={expandedRows.has(row.id)}
                                    onToggleExpand={() => toggleExpand(row.id)}
                                    onCycleStatus={() => cycleStatus(row.id, row.status)}
                                    onUpdateTheme={(theme) => updateTheme(row.id, theme)}
                                    onUpdateNotes={(notes) => updateNotes(row.id, notes)}
                                    onDelete={() => { if (confirm(`Delete ${drillLabel(row.date)}?`)) deletePlan(row.id); }}
                                    onAddBlock={addBlock}
                                    onRemoveBlock={removeBlock}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TswDrillRowItem({
  row,
  isOfficer,
  blocks,
  isExpanded,
  onToggleExpand,
  onCycleStatus,
  onUpdateTheme,
  onUpdateNotes,
  onDelete,
  onAddBlock,
  onRemoveBlock,
}: {
  row: PlanRow;
  isOfficer: boolean;
  blocks: PlanBlock[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCycleStatus: () => void;
  onUpdateTheme: (theme: string) => void;
  onUpdateNotes: (notes: string) => void;
  onDelete: () => void;
  onAddBlock: (planId: string, phase: 1 | 2 | 3 | null, topic: string, block_type?: BlockType) => void;
  onRemoveBlock: (blockId: string) => void;
}) {
  const [editingTheme, setEditingTheme] = useState(false);
  const [themeVal, setThemeVal] = useState(row.theme);
  const [notesVal, setNotesVal] = useState(row.notes ?? "");

  const saveTheme = () => {
    setEditingTheme(false);
    if (themeVal !== row.theme) onUpdateTheme(themeVal);
  };

  const eventBlocks = (t: BlockType) => blocks.filter((b) => b.block_type === t);

  return (
    <div>
      {/* Summary row */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer group"
        onClick={onToggleExpand}
      >
        <span className="shrink-0 text-gray-300">
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </span>
        <span className="w-14 shrink-0 text-xs font-mono text-gray-500">{drillLabel(row.date)}</span>

        <div className="flex-1 min-w-0">
          {editingTheme && isOfficer ? (
            <input
              autoFocus
              value={themeVal}
              onChange={(e) => setThemeVal(e.target.value)}
              onBlur={saveTheme}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTheme();
                if (e.key === "Escape") { setThemeVal(row.theme); setEditingTheme(false); }
              }}
              className="w-full text-sm border-b border-[#003087] outline-none bg-transparent py-0.5"
            />
          ) : (
            <p
              className={`text-sm font-medium text-gray-800 truncate ${isOfficer ? "cursor-pointer" : ""}`}
              onClick={(e) => { if (isOfficer) { e.stopPropagation(); setEditingTheme(true); } }}
              title={isOfficer ? "Click to edit theme" : undefined}
            >
              {row.theme || <span className="text-gray-300 italic">No theme</span>}
            </p>
          )}
        </div>

        {blocks.length > 0 && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400 shrink-0">
            {([1, 2, 3] as const).map((ph) => {
              const count = blocks.filter((b) => b.phase === ph).length;
              if (!count) return null;
              return (
                <span key={ph} className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PHASE_BADGE[ph]}`}>
                  L{ph}: {count}
                </span>
              );
            })}
          </span>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onCycleStatus(); }}
          disabled={!isOfficer}
          className={`shrink-0 border rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors ${STATUS_CLASS[row.status]} ${isOfficer ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
        >
          {STATUS_LABEL[row.status]}
        </button>

        {isOfficer && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="shrink-0 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 bg-gray-50/50 border-t border-gray-100 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
            {([1, 2, 3] as const).map((phase) => (
              <PhaseBlock
                key={phase}
                phase={phase}
                planId={row.id}
                planBlocks={blocks}
                isOfficer={isOfficer}
                onAddBlock={onAddBlock}
                onRemoveBlock={onRemoveBlock}
              />
            ))}
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Meeting Events</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {EVENT_SLOTS.map((slot) => (
                <EventSlot
                  key={slot.type}
                  slot={slot}
                  planId={row.id}
                  blocks={eventBlocks(slot.type)}
                  isOfficer={isOfficer}
                  onAddBlock={onAddBlock}
                  onRemoveBlock={onRemoveBlock}
                />
              ))}
            </div>
            {eventBlocks("custom").length > 0 && (
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                {eventBlocks("custom").map((b) => (
                  <div key={b.id} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
                    <span className="flex-1">{b.topic}</span>
                    {isOfficer && (
                      <button onClick={() => onRemoveBlock(b.id)}>
                        <X className="h-3 w-3 text-gray-400 hover:text-red-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {isOfficer && (
              <AddCustomEvent onAdd={(topic) => onAddBlock(row.id, null, topic, "custom")} />
            )}
          </div>

          {/* Notes */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Notes</p>
            {isOfficer ? (
              <textarea
                value={notesVal}
                onChange={(e) => setNotesVal(e.target.value)}
                onBlur={() => { if (notesVal !== (row.notes ?? "")) onUpdateNotes(notesVal); }}
                placeholder="Add notes for this meeting…"
                rows={2}
                className="w-full text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003087]/30 resize-none"
              />
            ) : (
              row.notes ? (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{row.notes}</p>
              ) : (
                <p className="text-xs text-gray-300 italic">No notes</p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
