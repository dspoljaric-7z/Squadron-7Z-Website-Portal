"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ClipboardCheck, Plus, X, ChevronRight, CheckCircle2, XCircle, AlertCircle, Settings, Trash2 } from "lucide-react";
import { HintButton } from "@/components/shared/hint-button";

const INSPECTIONS_HINTS = [
  { heading: "Starting an inspection", body: "Click 'New Inspection Session', choose the date, and select the cadets present. The portal pre-loads all active cadets." },
  { heading: "Grading items", body: "For each cadet, mark each inspection item as Pass, Fail, or N/A. Add notes on specific items if needed." },
  { heading: "Inspection items", body: "Click the 'Items' button to manage the inspection checklist — add, edit, or remove items like cover, uniform, brass, etc." },
  { heading: "Scores and records", body: "Completed inspection scores roll up into each cadet's attendance and record page, visible to the cadet and command staff." },
];
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Profile, UniformInspectionSession, UniformInspectionResult, InspectionItemDef } from "@/types/database";
import { addInspectionItem, deactivateInspectionItem } from "@/app/(app)/settings/actions";

const SCORE_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "Poor", color: "text-red-600", bg: "bg-red-100 border-red-300" },
  2: { label: "Needs Work", color: "text-amber-600", bg: "bg-amber-100 border-amber-300" },
  3: { label: "Satisfactory", color: "text-blue-600", bg: "bg-blue-100 border-blue-300" },
  4: { label: "Outstanding", color: "text-green-600", bg: "bg-green-100 border-green-300" },
};

type ProfileSnippet = Pick<Profile, "id" | "full_name" | "rank" | "role">;
type DrillSnippet = { id: string; date: string };
type SessionWithResults = UniformInspectionSession & { results?: (UniformInspectionResult & { profile?: ProfileSnippet })[] };
type ItemDef = { id: string; key: string; label: string };

function avgScore(scores: Record<string, number> | null): number | null {
  if (!scores) return null;
  const vals = Object.values(scores).filter((v) => v > 0);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-300">—</span>;
  const s = SCORE_LABELS[Math.round(score)];
  if (!s) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold border ${s.bg} ${s.color}`}>
      {score.toFixed(1)}
    </span>
  );
}

function ManageItemsDialog({
  items,
  onAdded,
  onRemoved,
  onClose,
}: {
  items: ItemDef[];
  onAdded: (item: InspectionItemDef) => void;
  onRemoved: (key: string) => void;
  onClose: () => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    const key = newLabel.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const res = await addInspectionItem(key, newLabel.trim());
    setAdding(false);
    if (res.error) { toast.error(res.error); return; }
    onAdded(res.data as unknown as InspectionItemDef);
    setNewLabel("");
    toast.success("Item added");
  };

  const handleRemove = async (item: ItemDef) => {
    if (!confirm(`Remove "${item.label}" from inspections?`)) return;
    const res = await deactivateInspectionItem(item.id);
    if (res.error) { toast.error(res.error); return; }
    onRemoved(item.key);
    toast.success("Item removed");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-gray-800">Manage Inspection Items</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {items.map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-lg border px-3 py-2">
              <p className="text-sm font-semibold text-gray-800">{item.label}</p>
              <button onClick={() => handleRemove(item)} className="text-red-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Add Item</p>
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Cover, Boots, Ribbons…"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30" />
            <Button onClick={handleAdd} disabled={adding || !newLabel.trim()} size="sm" className="w-full bg-[#003087] hover:bg-[#002266]">
              <Plus className="h-3.5 w-3.5 mr-1.5" />{adding ? "Adding…" : "Add Item"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CadetScoringSheet({
  cadet,
  existing,
  items,
  onSave,
  onClose,
}: {
  cadet: ProfileSnippet;
  existing: UniformInspectionResult | null;
  items: ItemDef[];
  onSave: (result: UniformInspectionResult) => void;
  onClose: () => void;
}) {
  const [scores, setScores] = useState<Record<string, number>>(
    (existing?.scores as Record<string, number>) ?? {}
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const avg = avgScore(scores);
  const passed = avg !== null ? avg >= 2.5 : false;
  const scoredCount = Object.keys(scores).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-bold text-gray-800">{cadet.full_name}</h2>
            {cadet.rank && <p className="text-xs text-gray-400">{cadet.rank}</p>}
          </div>
          <div className="flex items-center gap-3">
            {avg !== null && (
              <div className="text-right">
                <ScorePill score={avg} />
                <p className="text-[10px] text-gray-400 mt-0.5">{scoredCount}/{items.length} items</p>
              </div>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {items.map(({ key, label }) => {
            const score = scores[key] ?? 0;
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  {score > 0 && (
                    <span className={`text-xs font-semibold ${SCORE_LABELS[score].color}`}>
                      {SCORE_LABELS[score].label}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((val) => {
                    const s = SCORE_LABELS[val];
                    const active = score === val;
                    return (
                      <button
                        key={val}
                        onClick={() => setScores((prev) => {
                          if (prev[key] === val) {
                            const { [key]: _, ...rest } = prev;
                            void _;
                            return rest;
                          }
                          return { ...prev, [key]: val };
                        })}
                        className={`h-12 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 ${
                          active
                            ? `${s.bg} ${s.color} border-current shadow-sm`
                            : "border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="pt-2">
            <label className="mb-1 block text-sm font-medium text-gray-600">Notes / Deficiencies</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. lint on left sleeve, ribbon slightly off center…"
              rows={2}
              className="w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
            />
          </div>

          {avg !== null && (
            <div className={`flex items-center gap-2 rounded-lg p-3 ${passed ? "bg-green-50" : "bg-red-50"}`}>
              {passed
                ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                : <XCircle className="h-4 w-4 text-red-500" />}
              <span className={`text-sm font-semibold ${passed ? "text-green-700" : "text-red-600"}`}>
                {passed ? "PASS" : "FAIL"} — Average {avg.toFixed(1)}/4.0
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4 sticky bottom-0 bg-white">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={async () => {
              setSaving(true);
              // saved by parent
              onSave({
                ...(existing ?? { id: "", inspection_session_id: "", cadet_id: cadet.id, created_at: "" }),
                scores: Object.keys(scores).length > 0 ? scores : null,
                notes: notes.trim() || null,
                passed,
                deficiencies: notes.trim() || null,
              } as UniformInspectionResult);
              setSaving(false);
            }}
            disabled={saving || scoredCount === 0}
            className="bg-[#003087] hover:bg-[#002266]"
          >
            {saving ? "Saving…" : "Save Score"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function InspectionsClient({
  initialSessions,
  allProfiles,
  recentDrills,
  inspectionItems: initialItems,
  canManageItems,
}: {
  currentProfile?: Profile;
  initialSessions: UniformInspectionSession[];
  allProfiles: ProfileSnippet[];
  recentDrills: DrillSnippet[];
  inspectionItems: InspectionItemDef[];
  canManageItems: boolean;
}) {
  const [sessions, setSessions] = useState<SessionWithResults[]>(initialSessions);
  const [inspectionItems, setInspectionItems] = useState<ItemDef[]>(
    initialItems.map((i) => ({ id: i.id, key: i.item_key, label: i.label }))
  );
  const [showManageItems, setShowManageItems] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionResults, setSessionResults] = useState<Record<string, (UniformInspectionResult & { profile?: ProfileSnippet })[]>>({});
  const [scoringCadet, setScoringCadet] = useState<ProfileSnippet | null>(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newDrillId, setNewDrillId] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [loadingSession, setLoadingSession] = useState<string | null>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const activeResults = activeSessionId ? (sessionResults[activeSessionId] ?? []) : [];

  const loadSession = async (sessionId: string) => {
    if (sessionResults[sessionId]) { setActiveSessionId(sessionId); return; }
    setLoadingSession(sessionId);
    const supabase = createClient();
    const { data } = await supabase
      .from("uniform_inspection_results")
      .select("*")
      .eq("inspection_session_id", sessionId);
    const profMap = Object.fromEntries(allProfiles.map((p) => [p.id, p]));
    const enriched = (data ?? []).map((r) => ({ ...r, profile: profMap[r.cadet_id] })) as (UniformInspectionResult & { profile?: ProfileSnippet })[];
    setSessionResults((prev) => ({ ...prev, [sessionId]: enriched }));
    setActiveSessionId(sessionId);
    setLoadingSession(null);
  };

  const createSession = async () => {
    if (!newDate) return;
    setCreating(true);
    const supabase = createClient();
    const { data: me } = await supabase.from("profiles").select("id").eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "").maybeSingle();
    const { data, error } = await supabase
      .from("uniform_inspection_sessions")
      .insert({
        date: newDate,
        drill_session_id: newDrillId || null,
        conducted_by: me?.id ?? null,
        notes: newNotes.trim() || null,
      } as never)
      .select()
      .single();
    setCreating(false);
    if (error) { toast.error("Failed to create session"); return; }
    setSessions((prev) => [data as UniformInspectionSession, ...prev]);
    setSessionResults((prev) => ({ ...prev, [(data as UniformInspectionSession).id]: [] }));
    setActiveSessionId((data as UniformInspectionSession).id);
    setShowNewSession(false);
    setNewNotes("");
    setNewDrillId("");
    toast.success("Inspection session created");
  };

  const saveScore = async (result: UniformInspectionResult) => {
    if (!activeSessionId || !scoringCadet) return;
    const supabase = createClient();
    const existing = activeResults.find((r) => r.cadet_id === scoringCadet.id);

    let saved: UniformInspectionResult;
    if (existing) {
      const { data, error } = await supabase
        .from("uniform_inspection_results")
        .update({ scores: result.scores as never, notes: result.notes, passed: result.passed, deficiencies: result.deficiencies } as never)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) { toast.error("Failed to save"); return; }
      saved = data as UniformInspectionResult;
    } else {
      const { data, error } = await supabase
        .from("uniform_inspection_results")
        .insert({
          inspection_session_id: activeSessionId,
          cadet_id: scoringCadet.id,
          scores: result.scores as never,
          notes: result.notes,
          passed: result.passed,
          deficiencies: result.deficiencies,
        } as never)
        .select()
        .single();
      if (error) { toast.error("Failed to save"); return; }
      saved = data as UniformInspectionResult;
    }

    const enriched = { ...saved, profile: scoringCadet };
    setSessionResults((prev) => {
      const cur = prev[activeSessionId] ?? [];
      const exists = cur.find((r) => r.cadet_id === scoringCadet.id);
      return {
        ...prev,
        [activeSessionId]: exists
          ? cur.map((r) => (r.cadet_id === scoringCadet.id ? enriched : r))
          : [...cur, enriched],
      };
    });
    setScoringCadet(null);
    toast.success("Score saved");
  };

  const scoringExisting = scoringCadet
    ? (activeResults.find((r) => r.cadet_id === scoringCadet.id) ?? null)
    : null;

  const passCount = activeResults.filter((r) => r.passed).length;
  const inspectedIds = new Set(activeResults.map((r) => r.cadet_id));
  const uninspected = allProfiles.filter((p) => !inspectedIds.has(p.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-[#003087]" />
          <h1 className="text-xl font-bold text-gray-900">Uniform Inspections</h1>
          <HintButton title="Uniform Inspections" hints={INSPECTIONS_HINTS} />
        </div>
        <div className="flex items-center gap-2">
          {canManageItems && (
            <button
              onClick={() => setShowManageItems(true)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Settings className="h-4 w-4" /> Items
            </button>
          )}
          <Button onClick={() => setShowNewSession(true)} size="sm" className="bg-[#003087] hover:bg-[#002266]">
            <Plus className="mr-1.5 h-4 w-4" /> New Inspection
          </Button>
        </div>
      </div>

      {/* Session picker or active session */}
      {!activeSessionId ? (
        <div className="space-y-2">
          {sessions.length === 0 && (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-gray-400">
              No inspection sessions yet. Start one before the next drill.
            </div>
          )}
          {sessions.map((s) => (
            <Card
              key={s.id}
              className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              onClick={() => loadSession(s.id)}
            >
              <div>
                <p className="font-semibold text-gray-800">{new Date(s.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</p>
                {s.notes && <p className="text-xs text-gray-400">{s.notes}</p>}
              </div>
              <div className="flex items-center gap-3">
                {loadingSession === s.id
                  ? <span className="text-xs text-gray-400">Loading…</span>
                  : <ChevronRight className="h-4 w-4 text-gray-400" />}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Session header */}
          <div className="flex items-center justify-between">
            <button onClick={() => setActiveSessionId(null)} className="text-sm text-[#003087] hover:underline">
              ← All Sessions
            </button>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="font-semibold text-gray-700">
                {new Date(activeSession!.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </span>
              <Badge className="bg-green-100 text-green-700 border-green-200">{passCount} pass</Badge>
              <Badge className="bg-red-100 text-red-700 border-red-200">{activeResults.length - passCount} fail</Badge>
            </div>
          </div>

          {/* Inspected cadets */}
          {activeResults.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Inspected ({activeResults.length})</p>
              <div className="space-y-1.5">
                {activeResults.map((r) => {
                  const avg = avgScore(r.scores);
                  return (
                    <Card
                      key={r.id}
                      className="flex cursor-pointer items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                      onClick={() => setScoringCadet(r.profile ?? allProfiles.find((p) => p.id === r.cadet_id) ?? null)}
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{r.profile?.full_name ?? r.cadet_id}</p>
                        {r.profile?.rank && <p className="text-xs text-gray-400">{r.profile.rank}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {r.notes && <AlertCircle className="h-3.5 w-3.5 text-amber-400" />}
                        <ScorePill score={avg} />
                        {r.passed
                          ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                          : <XCircle className="h-4 w-4 text-red-400" />}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Not yet inspected */}
          {uninspected.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Not Yet Inspected ({uninspected.length})</p>
              <div className="space-y-1.5">
                {uninspected.map((p) => (
                  <Card
                    key={p.id}
                    className="flex cursor-pointer items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors border-dashed"
                    onClick={() => setScoringCadet(p)}
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{p.full_name}</p>
                      {p.rank && <p className="text-xs text-gray-400">{p.rank}</p>}
                    </div>
                    <span className="text-xs text-gray-300">Tap to score →</span>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New session modal */}
      {showNewSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-bold text-gray-800">New Inspection Session</h2>
              <button onClick={() => setShowNewSession(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Date *</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Linked Drill (optional)</label>
                <select
                  value={newDrillId}
                  onChange={(e) => setNewDrillId(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
                >
                  <option value="">— None —</option>
                  {recentDrills.map((d) => (
                    <option key={d.id} value={d.id}>{d.date}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Notes (optional)</label>
                <input
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Pre-inspection before formal review"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <Button variant="outline" onClick={() => setShowNewSession(false)}>Cancel</Button>
              <Button onClick={createSession} disabled={creating || !newDate} className="bg-[#003087] hover:bg-[#002266]">
                {creating ? "Creating…" : "Create Session"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cadet scoring sheet */}
      {scoringCadet && (
        <CadetScoringSheet
          cadet={scoringCadet}
          existing={scoringExisting}
          items={inspectionItems}
          onSave={saveScore}
          onClose={() => setScoringCadet(null)}
        />
      )}

      {showManageItems && (
        <ManageItemsDialog
          items={inspectionItems}
          onAdded={(item) => setInspectionItems((prev) => [...prev, { id: item.id, key: item.item_key, label: item.label }])}
          onRemoved={(key) => setInspectionItems((prev) => prev.filter((i) => i.key !== key))}
          onClose={() => setShowManageItems(false)}
        />
      )}
    </div>
  );
}
