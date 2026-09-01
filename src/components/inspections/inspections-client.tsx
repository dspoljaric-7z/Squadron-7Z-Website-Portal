"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Shirt, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { format, subYears } from "date-fns";
import { toast } from "sonner";
import { initials } from "@/lib/format";
import type { Profile, UniformInspectionSession, UniformInspectionResult } from "@/types/database";

type SessionRow = UniformInspectionSession & {
  conductor: { full_name: string } | null;
  uniform_inspection_results: UniformInspectionResult[];
};

type CadetRow = { id: string; full_name: string; rank: string | null; billet: string | null; division_id: string | null };

export function InspectionsClient({
  initialSessions,
  cadets,
  profile,
}: {
  initialSessions: SessionRow[];
  cadets: CadetRow[];
  profile: Profile;
}) {
  const [sessions, setSessions] = useState(initialSessions);
  const [showNew, setShowNew] = useState(false);
  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [results, setResults] = useState<Map<string, { passed: boolean; deficiencies: string; notes: string }>>(new Map());
  const [saving, setSaving] = useState(false);
  const [newForm, setNewForm] = useState({ date: new Date().toISOString().split("T")[0], notes: "" });

  // Rolling 12-month fail count per cadet (informational only, not automatic escalation)
  const failCounts = useMemo(() => {
    const cutoff = subYears(new Date(), 1);
    const counts = new Map<string, number>();
    for (const s of sessions) {
      const sessionDate = new Date(s.date);
      if (sessionDate < cutoff) continue;
      for (const r of s.uniform_inspection_results) {
        if (!r.passed) {
          counts.set(r.cadet_id, (counts.get(r.cadet_id) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, [sessions]);

  const startSession = async () => {
    if (!newForm.date) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("uniform_inspection_sessions")
      .insert({ date: newForm.date, conducted_by: profile.id, notes: newForm.notes || null })
      .select("*, conductor:profiles!uniform_inspection_sessions_conducted_by_fkey(full_name), uniform_inspection_results(*)")
      .single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    const session = data as unknown as SessionRow;
    setSessions((prev) => [session, ...prev]);
    // Pre-populate result map for all cadets
    const initMap = new Map<string, { passed: boolean; deficiencies: string; notes: string }>();
    for (const c of cadets) {
      initMap.set(c.id, { passed: true, deficiencies: "", notes: "" });
    }
    setResults(initMap);
    setActiveSession(session);
    setShowNew(false);
  };

  const saveResults = async () => {
    if (!activeSession) return;
    setSaving(true);
    const supabase = createClient();
    const rows = Array.from(results.entries()).map(([cadet_id, r]) => ({
      inspection_session_id: activeSession.id,
      cadet_id,
      passed: r.passed,
      deficiencies: r.deficiencies || null,
      notes: r.notes || null,
    }));
    const { error } = await supabase.from("uniform_inspection_results").upsert(rows, { onConflict: "inspection_session_id,cadet_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Inspection results saved");
    setActiveSession(null);
  };

  const passCount = Array.from(results.values()).filter((r) => r.passed).length;
  const totalInActive = results.size;

  if (activeSession) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => setActiveSession(null)} className="mb-1 text-sm text-gray-500 hover:text-gray-700">← Back</button>
            <h1 className="text-xl font-bold text-gray-900">
              Inspection — {format(new Date(activeSession.date + "T12:00:00"), "MMM d, yyyy")}
            </h1>
            <p className="text-sm text-gray-500">{passCount}/{totalInActive} passed</p>
          </div>
          <Button onClick={saveResults} disabled={saving} className="bg-[#003087] hover:bg-[#002266]">
            {saving ? "Saving…" : "Save Results"}
          </Button>
        </div>

        <div className="space-y-1">
          {cadets.map((cadet) => {
            const r = results.get(cadet.id) ?? { passed: true, deficiencies: "", notes: "" };
            const failCount12mo = failCounts.get(cadet.id) ?? 0;
            return (
              <Card key={cadet.id} className={`p-3 ${!r.passed ? "border-red-200 bg-red-50" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${r.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {initials(cadet.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{cadet.rank ? `${cadet.rank} ` : ""}{cadet.full_name}</p>
                      {failCount12mo >= 2 && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-600">
                          <AlertTriangle className="h-3 w-3" />{failCount12mo} fails (12mo)
                        </span>
                      )}
                    </div>
                    {!r.passed && (
                      <Input
                        value={r.deficiencies}
                        onChange={(e) => setResults((prev) => new Map(prev).set(cadet.id, { ...r, deficiencies: e.target.value }))}
                        placeholder="Deficiencies…"
                        className="mt-1 h-7 text-xs"
                      />
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => setResults((prev) => new Map(prev).set(cadet.id, { ...r, passed: true }))}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${r.passed ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400 hover:bg-green-100"}`}
                    >
                      <CheckCircle className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setResults((prev) => new Map(prev).set(cadet.id, { ...r, passed: false }))}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${!r.passed ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400 hover:bg-red-100"}`}
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shirt className="h-5 w-5 text-[#003087]" />
            <h1 className="text-xl font-bold text-gray-900">Uniform Inspections</h1>
          </div>
          <p className="text-sm text-gray-500">{sessions.length} inspection{sessions.length !== 1 ? "s" : ""} recorded</p>
        </div>
        <Button onClick={() => setShowNew(!showNew)} className="bg-[#003087] hover:bg-[#002266]" size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> New Inspection
        </Button>
      </div>

      {showNew && (
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold">New Inspection Session</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={newForm.date} onChange={(e) => setNewForm({ ...newForm, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={newForm.notes} onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })} placeholder="Optional" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={startSession} disabled={saving || !newForm.date} className="bg-[#003087] hover:bg-[#002266]">
              Start Inspection ({cadets.length} cadets)
            </Button>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {sessions.map((s) => {
          const passed = s.uniform_inspection_results.filter((r) => r.passed).length;
          const total = s.uniform_inspection_results.length;
          return (
            <Card key={s.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{format(new Date(s.date + "T12:00:00"), "EEEE, MMMM d, yyyy")}</p>
                  <p className="text-sm text-gray-500">
                    {s.conductor?.full_name ? `Conducted by ${s.conductor.full_name} · ` : ""}
                    {total > 0 ? `${passed}/${total} passed` : "No results recorded"}
                  </p>
                </div>
                {total > 0 && (
                  <Badge className={passed === total ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                    {total > 0 ? `${Math.round((passed / total) * 100)}%` : "—"}
                  </Badge>
                )}
              </div>
              {s.uniform_inspection_results.filter((r) => !r.passed).length > 0 && (
                <div className="mt-2 space-y-1">
                  {s.uniform_inspection_results.filter((r) => !r.passed).map((r) => {
                    const cadet = cadets.find((c) => c.id === r.cadet_id);
                    return (
                      <div key={r.id} className="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                        <XCircle className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-medium">{cadet?.full_name ?? "Unknown"}</span>
                        {r.deficiencies && <span className="text-red-500">— {r.deficiencies}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
