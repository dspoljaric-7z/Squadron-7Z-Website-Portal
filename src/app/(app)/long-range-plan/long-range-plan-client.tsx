"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addLrpBlock, removeLrpBlock, addLrpPlan } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Plus, Trash2, CalendarDays, AlertTriangle, X } from "lucide-react";
import { HintButton } from "@/components/shared/hint-button";

const LRP_HINTS = [
  { heading: "Adding a week", body: "Click 'Add Week' and enter the Monday start date, theme, and status. Weeks are grouped by semester/month automatically." },
  { heading: "Statuses", body: "Planned = tentative, Confirmed = locked in, Completed = done. Only confirmed and planned weeks show on the Training Schedule calendar." },
  { heading: "Adding training blocks", body: "Expand a week row to see its training blocks. Click '+' to add a block with a topic, type, and duration. Drag to reorder." },
  { heading: "LRP on the calendar", body: "Green pills on the Training Schedule calendar show each week's theme. Edit the theme here to update the calendar label." },
];
import { toast } from "sonner";
import { format, parseISO, getYear, getMonth } from "date-fns";
import type { Profile } from "@/types/database";

type PlanStatus = "planned" | "confirmed" | "completed";

type PlanRow = {
  id: string;
  week_start: string;
  theme: string;
  notes: string;
  status: PlanStatus;
  drill_type: "drill" | "event";
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
  { type: "prt",         label: "PRT",          placeholder: "e.g. 1.5mi run, Push-ups, Sit-ups",         color: "bg-red-50 border-red-200 text-red-800" },
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

const PHASE_LABEL: Record<1 | 2 | 3, string> = {
  1: "Phase 1 – Foundations",
  2: "Phase 2 – Leadership & Ops",
  3: "Phase 3 – Instructor Dev",
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

// Topics pulled from the S7Z Unit Operations document
const PHASE_TOPICS: Record<1 | 2 | 3, string[]> = {
  1: [
    "Customs & Courtesies",
    "Rank/Rate Recognition",
    "Chain of Command",
    "Drill Basics (Positions, Marching, Facing)",
    "Uniform Wear & Personal Appearance",
    "Basic Watchstanding & Quarterdeck Etiquette",
    "Military Bearing",
    "Sea Cadet Core Values",
    "Sea Cadet Oath",
    "General Orders (First 5)",
    "General Orders (All 11 – Introduction)",
    "Program History (Founded 1958, Female Cadets 1975)",
    "Anchors Aweigh",
    "Hazing/Bullying/Fraternization Prevention",
    "ORM Basics",
    "Cold/Heat Weather Safety",
    "Situational Awareness Training",
    "Travel & Overnight Safety",
    "Code of Conduct Introduction",
    "THINK Procedure",
    "Knots & Line Handling",
    "Parts of a Ship",
    "Deck Seamanship Terminology",
    "Basic Navigation (Compass, Bearings)",
    "Weather, Tides & Currents",
    "Map Reading",
    "Marine Weather Systems",
    "Buoyancy & Hull Shape",
    "Basic Signaling (Flags/Lights)",
    "Navy Platforms (Surface/Sub/Aviation)",
    "Navy Communities (SWO, SUB, SEAL, etc.)",
    "Maintaining Gear",
    "Standing Ready for Inspections",
    "Timeliness & Reporting",
    "Corrective Training",
  ],
  2: [
    "Command Voice",
    "Drill at Squad → Division Level",
    "Color Guard Qualification",
    "Uniform Inspection Mastery",
    "Gear & People Accountability",
    "Authority vs Earned Influence",
    "All 11 General Orders – Memorized",
    "Code of Conduct – Scenario-Based",
    "Core Values in Leadership",
    "Sea Cadet History – Why 1958 & 1975 Matter",
    "Anchors Aweigh – Lead Unit",
    "Leading a Fire Team",
    "Giving Clear Commands",
    "Correcting Peers Respectfully",
    "Enforcing Standards",
    "Teaching Phase 1 Skills",
    "Writing Accountability Reports",
    "Damage Control I",
    "First Aid / CPR / Bleeding Control",
    "Radio Communications Basics",
    "Land Navigation (Compass, Pace Count)",
    "Marine Weather Interpretation",
    "Navigation Plotting",
    "Signal Decoding (Flags/Lights/Morse)",
    "Environmental Science (Tides, Currents, Ecosystems)",
    "Intro to SAR Principles",
    "Squad Accountability Reports",
    "Pre/Post Drill Check-ins",
    "Muster Sheets",
    "After-Action Reviews",
    "1:1 Mentorship with Phase 1",
  ],
  3: [
    "Leading a Division",
    "Supervising PO3/PO2 Leaders",
    "Planning Drill Days",
    "Running Inspections",
    "Writing Lesson Plans",
    "Cadet Evaluations",
    "Mentoring Difficult Cadets (PIPs)",
    "Professional Communication with Adults",
    "Teaching Sea Cadet Oath, Core Values, General Orders",
    "Historical Context of Sea Cadet Program",
    "Anchors Aweigh – Lead & Teach History",
    "Ethics & Leadership – Values in Disciplinary Scenarios",
    "Code of Conduct Case Studies",
    "Division Accountability",
    "Mustering and Reporting",
    "Safety Briefs",
    "ORM Leadership",
    "Managing Equipment/Supplies",
    "Coordinating Ceremonial Events",
    "Damage Control II",
    "Emergency Medical Planning",
    "Maritime Operations SAR Leadership",
    "Cold-Weather Operations",
    "Emergency Signal Planning",
    "Water Safety Leadership",
    "Navigation Scenario Plotting",
    "Environmental Assessments",
    "Tide/Current Modeling",
    "Weather Prediction",
    "Systems-Thinking in Maritime Ops",
    "Boat Design/Mission Planning",
    "Instructor Development",
    "Public Speaking",
    "Classroom Management",
    "Multi-Age Instruction",
    "Running Entire Drill Blocks",
  ],
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function drillLabel(dateStr: string) {
  const d = parseISO(dateStr);
  return format(d, "MMM d");
}

export function LongRangePlanClient({
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
  const isOfficer = profile.role === "officer" || profile.role === "snco";
  const [rows, setRows] = useState<PlanRow[]>(initialRows);
  const [blocks, setBlocks] = useState<PlanBlock[]>(initialBlocks);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ drill_date: "", theme: "", notes: "", drill_type: "drill" as "drill" | "event" });
  const [saving, setSaving] = useState(false);
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const now = new Date();
  const currentYear = getYear(now);
  const currentMonth = getMonth(now);

  const allYears = Array.from(new Set(rows.map((r) => getYear(parseISO(r.week_start))))).sort();
  const futureYears = [currentYear, currentYear + 1, currentYear + 2].filter((y) => !allYears.includes(y));
  const years = Array.from(new Set([...allYears, ...futureYears])).sort();

  const [openYears, setOpenYears] = useState<Record<number, boolean>>(() => ({ [currentYear]: true }));
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>(() => ({ [`${currentYear}-${currentMonth}`]: true }));

  const toggleYear = (y: number) => setOpenYears((p) => ({ ...p, [y]: !p[y] }));
  const toggleMonth = (key: string) => setOpenMonths((p) => ({ ...p, [key]: !p[key] }));
  const toggleExpand = (id: string) =>
    setExpandedRows((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const filteredRows = yearFilter === "all" ? rows : rows.filter((r) => getYear(parseISO(r.week_start)) === yearFilter);

  const grouped: Record<number, Record<number, PlanRow[]>> = {};
  filteredRows.forEach((r) => {
    const y = getYear(parseISO(r.week_start));
    const m = getMonth(parseISO(r.week_start));
    if (!grouped[y]) grouped[y] = {};
    if (!grouped[y][m]) grouped[y][m] = [];
    grouped[y][m].push(r);
  });

  const blocksForRow = (planId: string) => blocks.filter((b) => b.plan_id === planId);

  const addRow = async () => {
    if (!addForm.drill_date) { toast.error("Pick a date"); return; }
    setSaving(true);
    const res = await addLrpPlan(addForm.drill_date, addForm.theme, addForm.notes, "planned", profile.id, addForm.drill_type);
    setSaving(false);
    if (res.error) { toast.error("Failed to add entry"); return; }
    setRows((p) => [...p, res.data as PlanRow].sort((a, b) => a.week_start.localeCompare(b.week_start)));
    setAddForm({ drill_date: "", theme: "", notes: "", drill_type: "drill" });
    setShowAdd(false);
    const y = getYear(parseISO(addForm.drill_date));
    const m = getMonth(parseISO(addForm.drill_date));
    setOpenYears((p) => ({ ...p, [y]: true }));
    setOpenMonths((p) => ({ ...p, [`${y}-${m}`]: true }));
    toast.success("Drill added");
  };

  const updateRow = async (id: string, patch: Partial<PlanRow>) => {
    const supabase = createClient();
    const { error } = await supabase.from("long_range_plan" as never).update({ ...patch, updated_at: new Date().toISOString() } as never).eq("id", id);
    if (error) { toast.error("Failed to save"); return; }
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const deleteRow = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("long_range_plan" as never).delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    setRows((p) => p.filter((r) => r.id !== id));
    setBlocks((p) => p.filter((b) => b.plan_id !== id));
    toast.success("Removed");
  };

  const addBlock = async (planId: string, phase: 1 | 2 | 3 | null, topic: string, block_type: BlockType = "phase") => {
    const existing = blocks.filter((b) => b.plan_id === planId && b.phase === phase && b.block_type === block_type);
    const res = await addLrpBlock(planId, phase, topic, block_type, existing.length);
    if (res.error) { toast.error(`Failed to add topic: ${res.error}`); return; }
    setBlocks((p) => [...p, res.data as PlanBlock]);
  };

  const removeBlock = async (blockId: string) => {
    const res = await removeLrpBlock(blockId);
    if (res.error) { toast.error("Failed to remove topic"); return; }
    setBlocks((p) => p.filter((b) => b.id !== blockId));
  };

  if (dbError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-[#003087]">Long-Range Plan</h1>
        <Card className="p-6 flex items-center gap-3 text-amber-700 bg-amber-50">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Table not set up yet</p>
            <p className="text-sm mt-0.5">Contact your admin to run the database migration. Error: {dbError}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-[#003087]" />
          <h1 className="text-2xl font-bold text-[#003087]">Long-Range Plan</h1>
          <HintButton title="Long-Range Plan" hints={LRP_HINTS} />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={yearFilter === "all" ? "all" : String(yearFilter)}
            onChange={(e) => setYearFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700"
          >
            <option value="all">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {isOfficer && (
            <Button size="sm" className="bg-[#003087] hover:bg-[#002266]" onClick={() => setShowAdd((v) => !v)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Entry
            </Button>
          )}
        </div>
      </div>

      {showAdd && isOfficer && (
        <Card className="p-4 border-[#003087]/20 bg-[#003087]/[0.02]">
          {/* Drill vs Event toggle */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setAddForm((p) => ({ ...p, drill_type: "drill" }))}
              className={`flex-1 rounded-md border py-1.5 text-xs font-semibold transition-colors ${addForm.drill_type === "drill" ? "bg-[#003087] text-white border-[#003087]" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
            >
              Drill
            </button>
            <button
              onClick={() => setAddForm((p) => ({ ...p, drill_type: "event" }))}
              className={`flex-1 rounded-md border py-1.5 text-xs font-semibold transition-colors ${addForm.drill_type === "event" ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
            >
              Event
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-gray-400">Date</Label>
              <Input type="date" value={addForm.drill_date} onChange={(e) => setAddForm((p) => ({ ...p, drill_date: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-gray-400">{addForm.drill_type === "event" ? "Event Name" : "Theme / Topic"}</Label>
              <Input value={addForm.theme} onChange={(e) => setAddForm((p) => ({ ...p, theme: e.target.value }))} placeholder={addForm.drill_type === "event" ? "e.g. DAV 5K, Color Guard Competition" : "e.g. Navigation, Drill"} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-gray-400">Notes</Label>
              <Input value={addForm.notes} onChange={(e) => setAddForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional" className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" className={addForm.drill_type === "event" ? "bg-purple-600 hover:bg-purple-700" : "bg-[#003087] hover:bg-[#002266]"} onClick={addRow} disabled={saving}>
              {saving ? "Saving…" : `Add ${addForm.drill_type === "event" ? "Event" : "Drill"}`}
            </Button>
          </div>
        </Card>
      )}

      {years.length === 0 || filteredRows.length === 0 ? (
        <Card className="p-8 text-center">
          <CalendarDays className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No entries yet.{isOfficer ? ' Click "Add Entry" to start planning.' : ""}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {years.map((year) => {
            const yearRows = grouped[year];
            if (!yearRows && yearFilter !== "all" && yearFilter !== year) return null;
            const isOpen = openYears[year] ?? false;
            const totalInYear = Object.values(yearRows ?? {}).flat().length;
            return (
              <Card key={year} className="overflow-hidden">
                <button
                  onClick={() => toggleYear(year)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#003087] text-white hover:bg-[#002266] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-semibold">{year}</span>
                    {year === currentYear && <Badge className="bg-white/20 text-white text-[10px] border-0">Current</Badge>}
                  </div>
                  <span className="text-sm text-white/70">{totalInYear} entr{totalInYear !== 1 ? "ies" : "y"}</span>
                </button>

                {isOpen && (
                  <div className="divide-y">
                    {MONTHS.map((monthName, monthIdx) => {
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
                            <span className="text-xs text-gray-400">{monthRows.length} entr{monthRows.length !== 1 ? "ies" : "y"}</span>
                          </button>

                          {isMonthOpen && (
                            <div className="divide-y">
                              {monthRows.map((row) => (
                                <DrillRowItem
                                  key={row.id}
                                  row={row}
                                  isOfficer={isOfficer}
                                  blocks={blocksForRow(row.id)}
                                  isExpanded={expandedRows.has(row.id)}
                                  profileId={profile.id}
                                  onToggleExpand={() => toggleExpand(row.id)}
                                  onUpdate={updateRow}
                                  onDelete={deleteRow}
                                  onAddBlock={addBlock}
                                  onRemoveBlock={removeBlock}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DrillRowItem({
  row,
  isOfficer,
  blocks,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onAddBlock,
  onRemoveBlock,
}: {
  row: PlanRow;
  isOfficer: boolean;
  blocks: PlanBlock[];
  isExpanded: boolean;
  profileId: string;
  onToggleExpand: () => void;
  onUpdate: (id: string, patch: Partial<PlanRow>) => void;
  onDelete: (id: string) => void;
  onAddBlock: (planId: string, phase: 1 | 2 | 3 | null, topic: string, block_type?: BlockType) => void;
  onRemoveBlock: (blockId: string) => void;
}) {
  const isEvent = (row.drill_type ?? "drill") === "event";
  const [editingTheme, setEditingTheme] = useState(false);
  const [themeVal, setThemeVal] = useState(row.theme);

  const saveTheme = () => {
    setEditingTheme(false);
    if (themeVal !== row.theme) onUpdate(row.id, { theme: themeVal });
  };
  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(row.id, { status: STATUS_NEXT[row.status] });
  };
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(row.id);
  };

  const totalBlocks = blocks.length;

  return (
    <div>
      {/* Summary row — click to expand */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer group"
        onClick={onToggleExpand}
      >
        <span className="shrink-0 text-gray-300">
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </span>
        <span className="w-14 shrink-0 text-xs font-mono text-gray-500">{drillLabel(row.week_start)}</span>

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

        {isEvent && (
          <span className="shrink-0 rounded-full bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 text-[10px] font-semibold">Event</span>
        )}
        {!isEvent && totalBlocks > 0 && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400 shrink-0">
            {([1, 2, 3] as const).map((ph) => {
              const count = blocks.filter((b) => b.phase === ph).length;
              if (!count) return null;
              return (
                <span key={ph} className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PHASE_BADGE[ph]}`}>
                  P{ph}: {count}
                </span>
              );
            })}
          </span>
        )}

        <button
          onClick={cycleStatus}
          disabled={!isOfficer}
          className={`shrink-0 border rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors ${STATUS_CLASS[row.status]} ${isOfficer ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
        >
          {STATUS_LABEL[row.status]}
        </button>

        {isOfficer && (
          <button
            onClick={handleDelete}
            className="shrink-0 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Expanded phase blocks + event slots */}
      {isExpanded && (
        <div className="px-4 pb-4 bg-gray-50/50 border-t border-gray-100 space-y-3">
          {/* Phase training columns — hidden for events */}
          {!isEvent && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
              {([1, 2, 3] as const).map((phase) => (
                <PhaseBlock
                  key={phase}
                  phase={phase}
                  planId={row.id}
                  blocks={blocks.filter((b) => b.phase === phase && b.block_type === "phase")}
                  isOfficer={isOfficer}
                  onAddBlock={onAddBlock}
                  onRemoveBlock={onRemoveBlock}
                />
              ))}
            </div>
          )}

          {/* Drill event slots */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Drill Events</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {EVENT_SLOTS.map((slot) => (
                <EventSlot
                  key={slot.type}
                  slot={slot}
                  planId={row.id}
                  blocks={blocks.filter((b) => b.block_type === slot.type)}
                  isOfficer={isOfficer}
                  onAddBlock={onAddBlock}
                  onRemoveBlock={onRemoveBlock}
                />
              ))}
            </div>
            {/* Custom additional events */}
            {blocks.filter((b) => b.block_type === "custom").length > 0 && (
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                {blocks.filter((b) => b.block_type === "custom").map((b) => (
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
              <AddCustomEvent planId={row.id} onAdd={(topic) => onAddBlock(row.id, null, topic, "custom")} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PhaseBlock({
  phase,
  planId,
  blocks,
  isOfficer,
  onAddBlock,
  onRemoveBlock,
}: {
  phase: 1 | 2 | 3;
  planId: string;
  blocks: PlanBlock[];
  isOfficer: boolean;
  onAddBlock: (planId: string, phase: 1 | 2 | 3 | null, topic: string, block_type?: BlockType) => void;
  onRemoveBlock: (blockId: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [customTopic, setCustomTopic] = useState("");
  const [search, setSearch] = useState("");

  const usedTopics = new Set(blocks.map((b) => b.topic));
  const suggestions = PHASE_TOPICS[phase].filter(
    (t) => !usedTopics.has(t) && (search === "" || t.toLowerCase().includes(search.toLowerCase()))
  );

  const addCustom = () => {
    const t = customTopic.trim();
    if (!t) return;
    onAddBlock(planId, phase, t, "phase");
    setCustomTopic("");
    setShowPicker(false);
    setSearch("");
  };

  return (
    <div className={`rounded-lg border p-3 ${PHASE_COLOR[phase]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-2 opacity-70">{PHASE_LABEL[phase]}</p>

      {blocks.length === 0 && (
        <p className="text-xs opacity-50 italic mb-2">No topics assigned</p>
      )}

      <div className="space-y-1 mb-2">
        {blocks.map((b) => (
          <div key={b.id} className="flex items-start gap-1 group/block">
            <span className="flex-1 text-xs leading-snug">{b.topic}</span>
            {isOfficer && (
              <button
                onClick={() => onRemoveBlock(b.id)}
                className="shrink-0 opacity-0 group-hover/block:opacity-100 transition-opacity mt-0.5"
              >
                <X className="h-3 w-3 opacity-50 hover:opacity-100" />
              </button>
            )}
          </div>
        ))}
      </div>

      {isOfficer && !showPicker && (
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1 text-xs opacity-60 hover:opacity-100 transition-opacity"
        >
          <Plus className="h-3 w-3" /> Add topic
        </button>
      )}

      {isOfficer && showPicker && (
        <div className="mt-2 space-y-1.5">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topics…"
            className="w-full rounded border border-current/20 bg-white/60 px-2 py-1 text-xs outline-none focus:bg-white/90"
          />
          {suggestions.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded border border-current/10 bg-white/80 divide-y divide-current/5">
              {suggestions.slice(0, 12).map((t) => (
                <button
                  key={t}
                  onClick={() => { onAddBlock(planId, phase, t, "phase"); setShowPicker(false); setSearch(""); }}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-current/5 transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-1">
            <input
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }}
              placeholder="Custom topic…"
              className="flex-1 rounded border border-current/20 bg-white/60 px-2 py-1 text-xs outline-none focus:bg-white/90"
            />
            <button
              onClick={addCustom}
              className="rounded bg-current/10 px-2 py-1 text-xs font-medium hover:bg-current/20 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setShowPicker(false); setSearch(""); setCustomTopic(""); }}
              className="rounded bg-current/10 px-2 py-1 text-xs hover:bg-current/20 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EventSlot({
  slot,
  planId,
  blocks,
  isOfficer,
  onAddBlock,
  onRemoveBlock,
}: {
  slot: { type: BlockType; label: string; placeholder: string; color: string };
  planId: string;
  blocks: PlanBlock[];
  isOfficer: boolean;
  onAddBlock: (planId: string, phase: 1 | 2 | 3 | null, topic: string, block_type?: BlockType) => void;
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
      {blocks.length > 0 ? (
        <div className="space-y-1">
          {blocks.map((b) => (
            <div key={b.id} className="flex items-center gap-1.5">
              <span className="flex-1 text-xs">{b.topic}</span>
              {isOfficer && (
                <button onClick={() => onRemoveBlock(b.id)}>
                  <X className="h-3 w-3 opacity-40 hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs opacity-40 italic">{slot.placeholder}</p>
      )}
      {isOfficer && (
        editing ? (
          <div className="mt-2 flex gap-1">
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") { setEditing(false); setText(""); }
              }}
              placeholder={slot.placeholder}
              className="flex-1 rounded border border-current/20 bg-white/60 px-2 py-1 text-xs outline-none focus:bg-white/90"
            />
            <button onClick={save} className="rounded bg-current/20 px-2 py-1 text-xs font-medium hover:bg-current/30">Add</button>
            <button onClick={() => { setEditing(false); setText(""); }} className="rounded bg-current/10 px-2 py-1 text-xs hover:bg-current/20">✕</button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="mt-2 flex items-center gap-1 text-xs opacity-50 hover:opacity-100 transition-opacity"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        )
      )}
    </div>
  );
}

function AddCustomEvent({
  onAdd,
}: {
  planId: string;
  onAdd: (topic: string) => void;
}) {
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
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") { setShow(false); setText(""); }
            }}
            placeholder="Custom event name…"
            className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-gray-400"
          />
          <button onClick={save} className="rounded bg-gray-100 px-2 py-1 text-xs font-medium hover:bg-gray-200">Add</button>
          <button onClick={() => { setShow(false); setText(""); }} className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200">✕</button>
        </div>
      ) : (
        <button
          onClick={() => setShow(true)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Plus className="h-3 w-3" /> Add custom event
        </button>
      )}
    </div>
  );
}
