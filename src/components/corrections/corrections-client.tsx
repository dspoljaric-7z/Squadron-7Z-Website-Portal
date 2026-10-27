"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Plus, CheckCircle, FileText, ShieldAlert, ClipboardList, Check, ListChecks, Calendar, Users, BookOpen, Clock, Trash2 } from "lucide-react";
import { format, addYears } from "date-fns";
import { toast } from "sonner";
import { CORRECTION_TIER_LABELS, CORRECTION_TIER_COLORS } from "@/lib/constants";
import type { Profile, Correction, CorrectiveAction, Pip, PipTask, CorrectionStatus } from "@/types/database";
import { initials } from "@/lib/format";
import { createPip as createPipAction, updatePipStatus, deletePip } from "@/app/(app)/discipline/actions";
import { SearchableSelect } from "@/components/shared/searchable-select";

const AREA_OF_CONCERN_OPTIONS = [
  { value: "attendance", label: "Attendance / Punctuality" },
  { value: "uniform", label: "Uniform / Appearance" },
  { value: "conduct", label: "Conduct / Behavior" },
  { value: "performance", label: "Performance / Participation" },
  { value: "academic", label: "Academic Performance" },
  { value: "physical_fitness", label: "Physical Fitness" },
  { value: "attitude", label: "Attitude / Teamwork" },
  { value: "multiple", label: "Multiple Areas" },
  { value: "other", label: "Other" },
];

const MEETING_FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "bi_weekly", label: "Every Two Weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "each_drill", label: "Each Drill" },
  { value: "as_needed", label: "As Needed" },
];

type CorrectionRow = Correction & {
  cadet: { id: string; full_name: string; rank: string | null } | null;
  issuer: { full_name: string } | null;
  approver: { full_name: string } | null;
  corrective_actions: CorrectiveAction[];
};

type PipRow = Pip & {
  cadet: { id: string; full_name: string; rank: string | null } | null;
  supervisor: { full_name: string; rank?: string | null } | null;
};

// Escalation: 3+ Tier II in rolling 12mo → PIP required; 3+ Tier III → EO Inquiry; any Tier IV → EO Inquiry
function checkEscalation(corrections: CorrectionRow[], cadetId: string): string[] {
  const now = new Date();
  const year = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const recent = corrections.filter((c) => c.cadet_id === cadetId && new Date(c.issued_at) > year && c.status !== "cleared");
  const tier2 = recent.filter((c) => c.tier === 2).length;
  const tier3 = recent.filter((c) => c.tier === 3).length;
  const tier4 = recent.filter((c) => c.tier === 4).length;
  const flags: string[] = [];
  if (tier2 >= 3) flags.push("3+ Tier II in 12 months — PIP required (§4.2)");
  if (tier3 >= 3) flags.push("3+ Tier III in 12 months — EO Inquiry required (§5)");
  if (tier4 >= 1) flags.push("Tier IV correction — EO Inquiry required unless immediate separation (§5)");
  return flags;
}

export function CorrectionsClient({
  initialCorrections,
  initialPips,
  cadets,
  profile,
  staffProfiles = [],
}: {
  initialCorrections: CorrectionRow[];
  initialPips: PipRow[];
  cadets: { id: string; full_name: string; rank: string | null }[];
  profile: Profile;
  staffProfiles?: { id: string; full_name: string; rank: string | null }[];
}) {
  const [corrections, setCorrections] = useState(initialCorrections);
  const [pips, setPips] = useState(initialPips);
  const [showNewCorrection, setShowNewCorrection] = useState(false);
  const [showNewPip, setShowNewPip] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCadet, setSelectedCadet] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [corrTab, setCorrTab] = useState<"corrections" | "pips">("corrections");

  const [corrForm, setCorrForm] = useState<{ cadet_id: string; tier: string; description: string }>({ cadet_id: "", tier: "1", description: "" });
  const [pipForm, setPipForm] = useState({
    cadet_id: "",
    area_of_concern: "",
    root_cause: "",
    specific_requirements: "",
    review_date: "",
    timeline: "",
    goals: "",
    support_resources: "",
    meeting_frequency: "",
    supervisor_id: "",
  });

  const escalationFlags = useMemo(() => {
    if (!corrForm.cadet_id) return [];
    return checkEscalation(corrections, corrForm.cadet_id);
  }, [corrections, corrForm.cadet_id]);

  const cadetEscalations = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of cadets) {
      const flags = checkEscalation(corrections, c.id);
      if (flags.length > 0) map.set(c.id, flags);
    }
    return map;
  }, [corrections, cadets]);

  const createCorrection = async () => {
    if (!corrForm.cadet_id || !corrForm.description) return;
    setSaving(true);
    const tier = parseInt(corrForm.tier) as 1 | 2 | 3 | 4;
    const supabase = createClient();

    // Retention: T1/T2 expire at next annual inspection; T3/T4 expire 1 year from issue
    const expiresAt = (tier <= 2)
      ? null // cleared at annual inspection, not date-based
      : format(addYears(new Date(), 1), "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("corrections")
      .insert({
        cadet_id: corrForm.cadet_id,
        tier,
        description: corrForm.description,
        issued_by: profile.id,
        // issued_at intentionally omitted — DB DEFAULT now() prevents backdating
        expires_at: expiresAt,
        status: "open",
      })
      .select("*, cadet:profiles!corrections_cadet_id_fkey(id, full_name, rank), issuer:profiles!corrections_issued_by_fkey(full_name), approver:profiles!corrections_approved_by_fkey(full_name), corrective_actions(*)")
      .single();

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setCorrections((prev) => [data as unknown as CorrectionRow, ...prev]);
    setShowNewCorrection(false);
    setCorrForm({ cadet_id: "", tier: "1", description: "" });
    toast.success("Correction recorded");

    if (tier === 3 || tier === 4) {
      toast.warning(`Tier ${tier} correction — Duty Officer approval required before this is valid.`);
    }

    // Notify the cadet
    await supabase.from("notifications").insert({
      profile_id: corrForm.cadet_id,
      type: "correction",
      title: `Tier ${tier} Correction`,
      body: corrForm.description.slice(0, 200),
    });
  };

  const approveCorrection = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("corrections").update({ approved_by: profile.id, approved_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setCorrections((prev) => prev.map((c) => c.id === id ? { ...c, approved_by: profile.id, approved_at: new Date().toISOString() } : c));
    toast.success("Correction approved");
  };

  const resolveCorrection = async (id: string, notes: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("corrections").update({ status: "resolved", resolution_notes: notes, resolved_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setCorrections((prev) => prev.map((c) => c.id === id ? { ...c, status: "resolved" as CorrectionStatus } : c));
    toast.success("Correction resolved");
  };

  const createPipHandler = async () => {
    if (!pipForm.cadet_id || !pipForm.root_cause || !pipForm.area_of_concern) return;
    setSaving(true);
    const result = await createPipAction(pipForm);
    setSaving(false);
    if (result.error) { toast.error(result.error); return; }

    // Optimistic update — fetch minimal pip data for display
    const cadet = cadets.find((c) => c.id === pipForm.cadet_id);
    const supervisor = staffProfiles.find((s) => s.id === pipForm.supervisor_id);
    const newPip: PipRow = {
      id: result.id!,
      cadet_id: pipForm.cadet_id,
      root_cause: pipForm.root_cause,
      timeline: pipForm.timeline || null,
      goals: pipForm.goals || null,
      supervisor_id: pipForm.supervisor_id || null,
      co_id: profile.id,
      status: "open",
      outcome_notes: null,
      opened_at: new Date().toISOString(),
      closed_at: null,
      closed_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      cadet_signature_date: null,
      supervisor_signature_date: null,
      co_signature_date: null,
      area_of_concern: pipForm.area_of_concern,
      specific_requirements: pipForm.specific_requirements || null,
      review_date: pipForm.review_date || null,
      support_resources: pipForm.support_resources || null,
      meeting_frequency: pipForm.meeting_frequency || null,
      cadet: cadet ? { id: cadet.id, full_name: cadet.full_name, rank: cadet.rank } : null,
      supervisor: supervisor ? { full_name: supervisor.full_name } : null,
    };
    setPips((prev) => [newPip, ...prev]);
    setShowNewPip(false);
    setPipForm({ cadet_id: "", area_of_concern: "", root_cause: "", specific_requirements: "", review_date: "", timeline: "", goals: "", support_resources: "", meeting_frequency: "", supervisor_id: "" });
    toast.success("PIP created — cadet and command staff notified");
  };

  const closePip = async (id: string, notes: string) => {
    const result = await updatePipStatus(id, "pending_ack", notes);
    if (result.error) { toast.error(result.error); return; }
    setPips((prev) => prev.map((p) => p.id === id ? { ...p, status: "pending_ack", outcome_notes: notes } : p));
    toast.success("PIP closed — awaiting cadet acknowledgment");
  };

  const failPip = async (id: string, notes: string) => {
    const result = await updatePipStatus(id, "failed", notes);
    if (result.error) { toast.error(result.error); return; }
    setPips((prev) => prev.map((p) => p.id === id ? { ...p, status: "failed", outcome_notes: notes } : p));
    toast.success("PIP marked as failed");
  };

  const handleDeletePip = async (id: string) => {
    const result = await deletePip(id);
    if (result.error) { toast.error(result.error); return; }
    setPips((prev) => prev.filter((p) => p.id !== id));
    toast.success("PIP deleted");
  };

  const openCorrections = corrections.filter((c) => c.status === "open");
  const filteredCorrections = selectedCadet
    ? corrections.filter((c) => c.cadet_id === selectedCadet)
    : corrections;

  const openPips = pips.filter((p) => p.status === "open");

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-[#003087]" />
            <h1 className="text-xl font-bold text-gray-900">Corrections & PIPs</h1>
            <Badge className="bg-red-100 text-red-700 border-red-200">Command Only</Badge>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            {openCorrections.length} open correction{openCorrections.length !== 1 ? "s" : ""} · {openPips.length} open PIP{openPips.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowNewPip(true)} variant="outline" size="sm">
            <FileText className="mr-1.5 h-4 w-4" /> New PIP
          </Button>
          <Button onClick={() => setShowNewCorrection(true)} className="bg-[#003087] hover:bg-[#002266]" size="sm">
            <Plus className="mr-1.5 h-4 w-4" /> New Correction
          </Button>
        </div>
      </div>

      {/* Escalation alerts */}
      {cadetEscalations.size > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-red-800">
              <AlertTriangle className="h-4 w-4" /> Escalation Thresholds Triggered
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-3">
            {Array.from(cadetEscalations.entries()).map(([cadetId, flags]) => {
              const cadet = cadets.find((c) => c.id === cadetId);
              return (
                <div key={cadetId} className="space-y-0.5">
                  <p className="text-sm font-medium text-red-900">{cadet?.rank ? `${cadet.rank} ` : ""}{cadet?.full_name}</p>
                  {flags.map((f) => (
                    <p key={f} className="text-xs text-red-700">• {f}</p>
                  ))}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            {(["corrections", "pips"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setCorrTab(t)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  corrTab === t
                    ? "border-[#003087] text-[#003087]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {t === "corrections" ? `Corrections (${corrections.length})` : `PIPs (${pips.length})`}
              </button>
            ))}
          </nav>
        </div>

        {corrTab === "corrections" && <div className="mt-3 space-y-3">
          <div className="flex gap-3">
            <Input placeholder="Search by name…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} className="h-9 max-w-xs" />
            <Select value={selectedCadet ?? "_all"} onValueChange={(v) => setSelectedCadet(v === "_all" ? null : v)}>
              <SelectTrigger className="h-9 w-48">
                <SelectValue placeholder="All cadets">
                  {selectedCadet
                    ? (() => { const c = cadets.find((x) => x.id === selectedCadet); return c ? `${c.rank ? c.rank + " " : ""}${c.full_name}` : null; })()
                    : "All cadets"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All cadets</SelectItem>
                {cadets.map((c) => <SelectItem key={c.id} value={c.id}>{c.rank ? `${c.rank} ` : ""}{c.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredCorrections.filter((c) => !searchQ || c.cadet?.full_name.toLowerCase().includes(searchQ.toLowerCase())).map((c) => (
            <CorrectionCard key={c.id} correction={c} onApprove={approveCorrection} onResolve={resolveCorrection} />
          ))}
        </div>}

        {corrTab === "pips" && <div className="mt-3 space-y-3">
          {pips.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
              No PIPs on record. Use &ldquo;New PIP&rdquo; to open one for a cadet.
            </div>
          )}
          {pips.map((p) => (
            <PipCard key={p.id} pip={p} onClose={closePip} onFail={failPip} onDelete={handleDeletePip} />
          ))}
        </div>}
      </div>

      {/* New Correction Dialog */}
      <Dialog open={showNewCorrection} onOpenChange={setShowNewCorrection}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Issue Correction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Cadet *</Label>
                <SearchableSelect
                  value={corrForm.cadet_id}
                  onChange={(v) => setCorrForm({ ...corrForm, cadet_id: v })}
                  placeholder="Select cadet…"
                  options={cadets.map((c) => ({ value: c.id, label: `${c.rank ? c.rank + " " : ""}${c.full_name}` }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tier *</Label>
                <Select value={corrForm.tier} onValueChange={(v) => setCorrForm({ ...corrForm, tier: v ?? "1" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Tier I — Minor (Petty Officer discretion)</SelectItem>
                    <SelectItem value="2">Tier II — Moderate (Petty Officer discretion)</SelectItem>
                    <SelectItem value="3">Tier III — Serious (Duty Officer approval req.)</SelectItem>
                    <SelectItem value="4">Tier IV — Severe (Duty Officer approval req.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {escalationFlags.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
                <p className="text-sm font-semibold text-red-800 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" />Escalation flags for this cadet:</p>
                {escalationFlags.map((f) => <p key={f} className="text-xs text-red-700">• {f}</p>)}
              </div>
            )}
            {(corrForm.tier === "3" || corrForm.tier === "4") && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                ⚠ Tier {corrForm.tier} corrections require Duty Officer approval before they are valid.
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea
                value={corrForm.description}
                onChange={(e) => setCorrForm({ ...corrForm, description: e.target.value })}
                placeholder="Describe the infraction and circumstances…"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCorrection(false)}>Cancel</Button>
            <Button onClick={createCorrection} disabled={saving || !corrForm.cadet_id || !corrForm.description} className="bg-[#003087] hover:bg-[#002266]">
              {saving ? "Saving…" : "Issue Correction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New PIP Dialog */}
      <Dialog open={showNewPip} onOpenChange={setShowNewPip}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#003087]" />
              Create Performance Improvement Plan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">

            {/* Section: Identification */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Cadet & Supervisor
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Cadet *</Label>
                  <SearchableSelect
                    value={pipForm.cadet_id}
                    onChange={(v) => setPipForm({ ...pipForm, cadet_id: v })}
                    placeholder="Select cadet…"
                    options={cadets.map((c) => ({ value: c.id, label: `${c.rank ? c.rank + " " : ""}${c.full_name}` }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Assigned Supervisor</Label>
                  <SearchableSelect
                    value={pipForm.supervisor_id}
                    onChange={(v) => setPipForm({ ...pipForm, supervisor_id: v })}
                    placeholder="Select supervisor…"
                    options={staffProfiles.map((s) => ({ value: s.id, label: `${s.rank ? s.rank + " " : ""}${s.full_name}` }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Area of Concern *</Label>
                <Select value={pipForm.area_of_concern} onValueChange={(v) => setPipForm({ ...pipForm, area_of_concern: v ?? "" })}>
                  <SelectTrigger><SelectValue placeholder="Select primary area…" /></SelectTrigger>
                  <SelectContent>
                    {AREA_OF_CONCERN_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Section: Analysis */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> Analysis & Requirements
              </p>
              <div className="space-y-1.5">
                <Label>Root Cause Analysis *</Label>
                <Textarea
                  value={pipForm.root_cause}
                  onChange={(e) => setPipForm({ ...pipForm, root_cause: e.target.value })}
                  placeholder="Describe the root cause of the performance issue. Include specific incidents or patterns observed…"
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Specific Improvement Requirements</Label>
                <Textarea
                  value={pipForm.specific_requirements}
                  onChange={(e) => setPipForm({ ...pipForm, specific_requirements: e.target.value })}
                  placeholder="List exact behaviors or standards the cadet must meet (e.g., &#39;Arrive in uniform NLT 1345 every drill&#39;, &#39;Zero Tier I or II corrections for 60 days&#39;)…"
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Goals / Expected Outcomes</Label>
                <Textarea
                  value={pipForm.goals}
                  onChange={(e) => setPipForm({ ...pipForm, goals: e.target.value })}
                  placeholder="What does successful completion look like? Include measurable targets…"
                  rows={2}
                />
              </div>
            </div>

            {/* Section: Plan */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Plan & Schedule
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Review / Target Completion Date</Label>
                  <Input
                    type="date"
                    value={pipForm.review_date}
                    onChange={(e) => setPipForm({ ...pipForm, review_date: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Check-in Frequency</Label>
                  <Select value={pipForm.meeting_frequency} onValueChange={(v) => setPipForm({ ...pipForm, meeting_frequency: v ?? "" })}>
                    <SelectTrigger><SelectValue placeholder="Select frequency…" /></SelectTrigger>
                    <SelectContent>
                      {MEETING_FREQUENCY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Timeline / Milestones</Label>
                <Textarea
                  value={pipForm.timeline}
                  onChange={(e) => setPipForm({ ...pipForm, timeline: e.target.value })}
                  placeholder="List key milestones and checkpoint dates (e.g., Week 2: first check-in; Week 6: mid-point review)…"
                  rows={2}
                />
              </div>
            </div>

            {/* Section: Support */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Support Resources
              </p>
              <div className="space-y-1.5">
                <Label>Support / Resources Offered</Label>
                <Textarea
                  value={pipForm.support_resources}
                  onChange={(e) => setPipForm({ ...pipForm, support_resources: e.target.value })}
                  placeholder="What support is being provided? (e.g., mentoring from PO1, uniform loaner, academic help, additional drill time)…"
                  rows={2}
                />
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">After creating this PIP:</p>
              <ul className="mt-1 list-disc list-inside text-xs space-y-0.5 text-amber-700">
                <li>The cadet will be notified immediately</li>
                <li>Command staff (CO/XO) will be notified</li>
                <li>The supervisor will be notified if assigned</li>
                <li>Tasks can be added after creation from the PIP card</li>
                <li>The cadet must acknowledge closure when this PIP is completed</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setShowNewPip(false)}>Cancel</Button>
            <Button
              onClick={createPipHandler}
              disabled={saving || !pipForm.cadet_id || !pipForm.root_cause || !pipForm.area_of_concern}
              className="bg-[#003087] hover:bg-[#002266]"
            >
              {saving ? "Creating…" : "Create PIP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CorrectionCard({ correction: c, onApprove, onResolve }: {
  correction: CorrectionRow;
  onApprove: (id: string) => void;
  onResolve: (id: string, notes: string) => void;
}) {
  const [resNotes, setResNotes] = useState("");
  const [showResolve, setShowResolve] = useState(false);
  const [showAddAction, setShowAddAction] = useState(false);
  const [actionDesc, setActionDesc] = useState("");
  const [actionDue, setActionDue] = useState("");
  const [savingAction, setSavingAction] = useState(false);
  const [actions, setActions] = useState<CorrectiveAction[]>(c.corrective_actions);
  const needsApproval = (c.tier === 3 || c.tier === 4) && !c.approved_by;

  const addAction = async () => {
    if (!actionDesc.trim()) return;
    setSavingAction(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("corrective_actions")
      .insert({
        correction_id: c.id,
        description: actionDesc.trim(),
        due_date: actionDue || null,
      })
      .select()
      .single();
    setSavingAction(false);
    if (error) { toast.error("Failed to add action"); return; }
    setActions((prev) => [...prev, data as CorrectiveAction]);
    setActionDesc("");
    setActionDue("");
    setShowAddAction(false);
    toast.success("Action added");
  };

  const toggleAction = async (actionId: string, completed: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("corrective_actions")
      .update({ completed, completed_at: completed ? new Date().toISOString() : null })
      .eq("id", actionId);
    if (error) { toast.error("Failed to update action"); return; }
    setActions((prev) => prev.map((a) => a.id === actionId ? { ...a, completed } : a));
  };

  return (
    <Card className={c.status !== "open" ? "opacity-60" : ""}>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge className={CORRECTION_TIER_COLORS[c.tier]}>{CORRECTION_TIER_LABELS[c.tier]}</Badge>
            {needsApproval && <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Needs DO Approval</Badge>}
            {c.status === "resolved" && <Badge className="bg-gray-100 text-gray-600 text-xs">Resolved</Badge>}
          </div>
          <div className="text-xs text-gray-400">{format(new Date(c.issued_at), "MMM d, yyyy")}</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#003087]/10 text-xs font-bold text-[#003087]">
            {initials(c.cadet?.full_name ?? "?")}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {c.cadet?.rank ? `${c.cadet.rank} ` : ""}{c.cadet?.full_name ?? "Unknown"}
            </p>
            <p className="text-xs text-gray-400">Issued by {c.issuer?.full_name ?? "Unknown"}</p>
          </div>
        </div>

        <p className="text-sm text-gray-700">{c.description}</p>

        {c.approved_by && (
          <p className="text-xs text-green-700 flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" />
            Approved by {c.approver?.full_name} · {c.approved_at ? format(new Date(c.approved_at), "MMM d") : ""}
          </p>
        )}

        {c.expires_at && (
          <p className="text-xs text-gray-400">Expires {format(new Date(c.expires_at), "MMM d, yyyy")}</p>
        )}

        {/* Corrective Actions */}
        {(actions.length > 0 || c.status === "open") && (
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <ClipboardList className="h-3 w-3" /> Corrective Actions
              </p>
              {c.status === "open" && !showAddAction && (
                <button
                  onClick={() => setShowAddAction(true)}
                  className="text-xs text-[#003087] hover:underline flex items-center gap-0.5"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              )}
            </div>
            {actions.map((a) => (
              <div key={a.id} className={`flex items-center gap-2 rounded border px-2 py-1.5 text-xs ${a.completed ? "bg-green-50 border-green-200" : "bg-gray-50"}`}>
                <button
                  onClick={() => toggleAction(a.id, !a.completed)}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${a.completed ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-[#003087]"}`}
                >
                  {a.completed && <Check className="h-3 w-3" />}
                </button>
                <span className={a.completed ? "line-through text-green-700" : "text-gray-700"}>{a.description}</span>
                {a.due_date && <span className="ml-auto shrink-0 text-gray-400">Due {format(new Date(a.due_date), "MMM d")}</span>}
              </div>
            ))}
            {actions.length === 0 && !showAddAction && (
              <p className="text-xs text-gray-400 italic">No corrective actions assigned.</p>
            )}
            {showAddAction && (
              <div className="rounded border border-[#003087]/20 bg-blue-50 p-2 space-y-2">
                <Input
                  value={actionDesc}
                  onChange={(e) => setActionDesc(e.target.value)}
                  placeholder="Describe the corrective action…"
                  className="h-7 text-xs"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={actionDue}
                    onChange={(e) => setActionDue(e.target.value)}
                    className="h-7 text-xs flex-1"
                  />
                  <Button size="sm" className="h-7 text-xs bg-[#003087] hover:bg-[#002266]" onClick={addAction} disabled={savingAction || !actionDesc.trim()}>
                    {savingAction ? "Saving…" : "Add"}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowAddAction(false); setActionDesc(""); setActionDue(""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {c.status === "resolved" && (c.resolution_notes || c.resolved_at) && (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800 space-y-0.5">
            <p className="font-semibold flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" />Resolved {c.resolved_at ? format(new Date(c.resolved_at), "MMM d, yyyy 'at' HH:mm") : ""}</p>
            {c.resolution_notes && <p className="italic">{c.resolution_notes}</p>}
          </div>
        )}
        {c.status === "open" && (
          <div className="flex gap-2 pt-1">
            {needsApproval && (
              <Button size="sm" variant="outline" className="text-xs h-7 border-green-300 text-green-700 hover:bg-green-50" onClick={() => onApprove(c.id)}>
                Approve (DO)
              </Button>
            )}
            {!showResolve && (
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowResolve(true)}>
                Resolve
              </Button>
            )}
            {showResolve && (
              <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
                <Textarea
                  value={resNotes}
                  onChange={(e) => setResNotes(e.target.value)}
                  placeholder="Resolution notes (required)…"
                  rows={2}
                  className="text-xs resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-[#003087] hover:bg-[#002266]"
                    disabled={!resNotes.trim()}
                    onClick={() => { onResolve(c.id, resNotes); setShowResolve(false); }}
                  >
                    Confirm Resolution
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowResolve(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function PipCard({ pip, onClose, onFail, onDelete }: {
  pip: PipRow;
  onClose: (id: string, notes: string) => void;
  onFail: (id: string, notes: string) => void;
  onDelete: (id: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const [showClose, setShowClose] = useState(false);
  const [showFail, setShowFail] = useState(false);
  const [failNotes, setFailNotes] = useState("");
  const [tasks, setTasks] = useState<PipTask[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  const loadTasks = async () => {
    if (tasksLoaded) return;
    const supabase = createClient();
    const { data } = await supabase.from("pip_tasks").select("*").eq("pip_id", pip.id).order("created_at");
    setTasks((data as PipTask[]) ?? []);
    setTasksLoaded(true);
  };

  const toggleShowTasks = async () => {
    if (!showTasks) await loadTasks();
    setShowTasks((v) => !v);
  };

  const addTask = async () => {
    if (!newTaskDesc.trim()) return;
    setSavingTask(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("pip_tasks")
      .insert({ pip_id: pip.id, description: newTaskDesc.trim(), due_date: newTaskDue || null })
      .select()
      .single();
    setSavingTask(false);
    if (error) { toast.error("Failed to add task"); return; }
    setTasks((prev) => [...prev, data as PipTask]);
    setNewTaskDesc("");
    setNewTaskDue("");
    toast.success("Task added");
  };

  const toggleTask = async (taskId: string, done: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("pip_tasks")
      .update({ completed_at: done ? new Date().toISOString() : null })
      .eq("id", taskId);
    if (error) { toast.error("Failed to update task"); return; }
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, completed_at: done ? new Date().toISOString() : null } : t));
  };

  const statusBadge = () => {
    switch (pip.status) {
      case "open": return "bg-amber-100 text-amber-800 border-amber-200";
      case "pending_ack": return "bg-blue-100 text-blue-800 border-blue-200";
      case "closed": return "bg-green-100 text-green-800 border-green-200";
      case "failed": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-600";
    }
  };
  const statusLabel = () => {
    switch (pip.status) {
      case "pending_ack": return "Pending Acknowledgment";
      default: return pip.status.charAt(0).toUpperCase() + pip.status.slice(1);
    }
  };

  return (
    <Card className={pip.status !== "open" && pip.status !== "pending_ack" ? "opacity-60" : ""}>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#003087]" />
            <span className="font-semibold text-gray-900">
              {pip.cadet?.rank ? `${pip.cadet.rank} ` : ""}{pip.cadet?.full_name ?? "Unknown"}
            </span>
            <Badge className={statusBadge()} variant="outline">{statusLabel()}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Opened {format(new Date(pip.opened_at), "MMM d, yyyy")}</span>
            <button
              onClick={() => { if (confirm("Delete this PIP permanently?")) onDelete(pip.id); }}
              className="text-red-400 hover:text-red-600 transition-colors"
              title="Delete PIP"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="space-y-1.5 text-sm text-gray-700">
          {(pip as Pip & { area_of_concern?: string | null }).area_of_concern && (
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                {AREA_OF_CONCERN_OPTIONS.find((o) => o.value === (pip as Pip & { area_of_concern?: string | null }).area_of_concern)?.label ?? (pip as Pip & { area_of_concern?: string | null }).area_of_concern}
              </Badge>
              {(pip as Pip & { review_date?: string | null }).review_date && (
                <span className="text-xs text-amber-700 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Review by {format(new Date((pip as Pip & { review_date?: string | null }).review_date!), "MMM d, yyyy")}
                </span>
              )}
              {(pip as Pip & { meeting_frequency?: string | null }).meeting_frequency && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {MEETING_FREQUENCY_OPTIONS.find((o) => o.value === (pip as Pip & { meeting_frequency?: string | null }).meeting_frequency)?.label}
                </span>
              )}
            </div>
          )}
          <div>
            <span className="font-medium">Root Cause:</span> {pip.root_cause}
          </div>
          {(pip as Pip & { specific_requirements?: string | null }).specific_requirements && (
            <div>
              <span className="font-medium">Requirements:</span> {(pip as Pip & { specific_requirements?: string | null }).specific_requirements}
            </div>
          )}
          {pip.goals && <div><span className="font-medium">Goals:</span> {pip.goals}</div>}
          {pip.timeline && <div><span className="font-medium">Timeline:</span> {pip.timeline}</div>}
          {(pip as Pip & { support_resources?: string | null }).support_resources && (
            <div>
              <span className="font-medium">Support Offered:</span> {(pip as Pip & { support_resources?: string | null }).support_resources}
            </div>
          )}
          {pip.supervisor && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Users className="h-3 w-3" />
              Supervisor: {pip.supervisor.full_name}
            </div>
          )}
        </div>
        {/* Task checklist */}
        <div>
          <button
            onClick={toggleShowTasks}
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-[#003087]"
          >
            <ListChecks className="h-3.5 w-3.5" />
            Tasks {tasksLoaded ? `(${tasks.length})` : ""}
          </button>
          {showTasks && (
            <div className="mt-2 space-y-1.5">
              {tasks.map((t) => (
                <div key={t.id} className={`flex items-center gap-2 rounded border px-2 py-1.5 text-xs ${t.completed_at ? "bg-green-50 border-green-200" : "bg-gray-50"}`}>
                  <button
                    onClick={() => toggleTask(t.id, !t.completed_at)}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${t.completed_at ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-[#003087]"}`}
                  >
                    {t.completed_at && <Check className="h-3 w-3" />}
                  </button>
                  <span className={t.completed_at ? "line-through text-green-700" : "text-gray-700"}>{t.description}</span>
                  {t.due_date && <span className="ml-auto shrink-0 text-gray-400">Due {format(new Date(t.due_date), "MMM d")}</span>}
                </div>
              ))}
              {tasks.length === 0 && !savingTask && (
                <p className="text-xs text-gray-400 italic">No tasks yet.</p>
              )}
              {pip.status === "open" && (
                <div className="rounded border border-[#003087]/20 bg-blue-50 p-2 space-y-2">
                  <Input value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} placeholder="Task description…" className="h-7 text-xs" />
                  <div className="flex items-center gap-2">
                    <Input type="date" value={newTaskDue} onChange={(e) => setNewTaskDue(e.target.value)} className="h-7 text-xs flex-1" />
                    <Button size="sm" className="h-7 text-xs bg-[#003087] hover:bg-[#002266]" onClick={addTask} disabled={savingTask || !newTaskDesc.trim()}>
                      {savingTask ? "…" : "Add"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {pip.status === "pending_ack" && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Awaiting cadet acknowledgment — cadet must sign off in their portal.
          </div>
        )}
        {pip.status === "open" && (
          <>
            {!showClose && !showFail && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="text-xs h-8 border-green-300 text-green-700 hover:bg-green-50" onClick={() => setShowClose(true)}>
                  Close (Step 1 of 2)
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-8 border-red-300 text-red-700 hover:bg-red-50" onClick={() => setShowFail(true)}>
                  Mark Failed
                </Button>
              </div>
            )}
            {showClose && (
              <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-xs font-semibold text-green-800">Step 1: Close PIP — cadet will acknowledge in Step 2</p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Close-out notes (required for cadet acknowledgment)…"
                  rows={2}
                  className="text-xs resize-none"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white" disabled={!notes.trim()} onClick={() => { onClose(pip.id, notes); setShowClose(false); }}>
                    Submit
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowClose(false)}>Cancel</Button>
                </div>
              </div>
            )}
            {showFail && (
              <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-semibold text-red-800">Mark PIP as Failed — this will be recorded with a timestamp</p>
                <Textarea
                  value={failNotes}
                  onChange={(e) => setFailNotes(e.target.value)}
                  placeholder="Describe why the PIP was not completed (required)…"
                  rows={2}
                  className="text-xs resize-none"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white" disabled={!failNotes.trim()} onClick={() => { onFail(pip.id, failNotes); setShowFail(false); }}>
                    Confirm Failure
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowFail(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </>
        )}
        {pip.outcome_notes && (
          <div className={`rounded-md border px-3 py-2 text-xs space-y-0.5 ${pip.status === "failed" ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}>
            <p className="font-semibold">{pip.status === "failed" ? "Failed" : "Closed"}{pip.closed_at ? ` · ${format(new Date(pip.closed_at), "MMM d, yyyy 'at' HH:mm")}` : ""}</p>
            <p className="italic">{pip.outcome_notes}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
