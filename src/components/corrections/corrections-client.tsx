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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Plus, CheckCircle, FileText, ShieldAlert, ClipboardList, Check } from "lucide-react";
import { format, addYears } from "date-fns";
import { toast } from "sonner";
import { CORRECTION_TIER_LABELS, CORRECTION_TIER_COLORS } from "@/lib/constants";
import type { Profile, Correction, CorrectiveAction, Pip, CorrectionStatus } from "@/types/database";
import { initials } from "@/lib/format";

type CorrectionRow = Correction & {
  cadet: { id: string; full_name: string; rank: string | null } | null;
  issuer: { full_name: string } | null;
  approver: { full_name: string } | null;
  corrective_actions: CorrectiveAction[];
};

type PipRow = Pip & {
  cadet: { id: string; full_name: string; rank: string | null } | null;
  supervisor: { full_name: string } | null;
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
}: {
  initialCorrections: CorrectionRow[];
  initialPips: PipRow[];
  cadets: { id: string; full_name: string; rank: string | null }[];
  profile: Profile;
}) {
  const [corrections, setCorrections] = useState(initialCorrections);
  const [pips, setPips] = useState(initialPips);
  const [showNewCorrection, setShowNewCorrection] = useState(false);
  const [showNewPip, setShowNewPip] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCadet, setSelectedCadet] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");

  const [corrForm, setCorrForm] = useState<{ cadet_id: string; tier: string; description: string }>({ cadet_id: "", tier: "1", description: "" });
  const [pipForm, setPipForm] = useState({ cadet_id: "", root_cause: "", timeline: "", goals: "" });

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

  const createPip = async () => {
    if (!pipForm.cadet_id || !pipForm.root_cause) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("pips")
      .insert({ ...pipForm, co_id: profile.id, status: "open" })
      .select("*, cadet:profiles!pips_cadet_id_fkey(id, full_name, rank), supervisor:profiles!pips_supervisor_id_fkey(full_name)")
      .single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setPips((prev) => [data as unknown as PipRow, ...prev]);
    setShowNewPip(false);
    setPipForm({ cadet_id: "", root_cause: "", timeline: "", goals: "" });
    toast.success("PIP created");
  };

  const closePip = async (id: string, status: "closed" | "failed", notes: string) => {
    const supabase = createClient();
    await supabase.from("pips").update({ status, outcome_notes: notes, closed_at: new Date().toISOString() }).eq("id", id);
    setPips((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
    toast.success(`PIP ${status}`);
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

      <Tabs defaultValue="corrections">
        <TabsList>
          <TabsTrigger value="corrections">Corrections ({corrections.length})</TabsTrigger>
          <TabsTrigger value="pips">PIPs ({pips.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="corrections" className="mt-3 space-y-3">
          <div className="flex gap-3">
            <Input placeholder="Search by name…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} className="h-9 max-w-xs" />
            <Select value={selectedCadet ?? "_all"} onValueChange={(v) => setSelectedCadet(v === "_all" ? null : v)}>
              <SelectTrigger className="h-9 w-48"><SelectValue placeholder="All cadets" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All cadets</SelectItem>
                {cadets.map((c) => <SelectItem key={c.id} value={c.id}>{c.rank ? `${c.rank} ` : ""}{c.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredCorrections.filter((c) => !searchQ || c.cadet?.full_name.toLowerCase().includes(searchQ.toLowerCase())).map((c) => (
            <CorrectionCard key={c.id} correction={c} onApprove={approveCorrection} onResolve={resolveCorrection} />
          ))}
        </TabsContent>

        <TabsContent value="pips" className="mt-3 space-y-3">
          {pips.map((p) => (
            <PipCard key={p.id} pip={p} onClose={closePip} />
          ))}
        </TabsContent>
      </Tabs>

      {/* New Correction Dialog */}
      <Dialog open={showNewCorrection} onOpenChange={setShowNewCorrection}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Issue Correction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Cadet *</Label>
                <Select value={corrForm.cadet_id} onValueChange={(v) => setCorrForm({ ...corrForm, cadet_id: v ?? "" })}>
                  <SelectTrigger><SelectValue placeholder="Select cadet…" /></SelectTrigger>
                  <SelectContent>
                    {cadets.map((c) => <SelectItem key={c.id} value={c.id}>{c.rank ? `${c.rank} ` : ""}{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Create Performance Improvement Plan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cadet *</Label>
              <Select value={pipForm.cadet_id} onValueChange={(v) => setPipForm({ ...pipForm, cadet_id: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Select cadet…" /></SelectTrigger>
                <SelectContent>
                  {cadets.map((c) => <SelectItem key={c.id} value={c.id}>{c.rank ? `${c.rank} ` : ""}{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Root Cause Analysis *</Label>
              <Textarea value={pipForm.root_cause} onChange={(e) => setPipForm({ ...pipForm, root_cause: e.target.value })} placeholder="What is the root cause of the performance issue?" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Timeline</Label>
              <Textarea value={pipForm.timeline} onChange={(e) => setPipForm({ ...pipForm, timeline: e.target.value })} placeholder="Milestones and check-in dates…" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Goals / Expected Outcomes</Label>
              <Textarea value={pipForm.goals} onChange={(e) => setPipForm({ ...pipForm, goals: e.target.value })} placeholder="Specific, measurable goals…" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPip(false)}>Cancel</Button>
            <Button onClick={createPip} disabled={saving || !pipForm.cadet_id || !pipForm.root_cause} className="bg-[#003087] hover:bg-[#002266]">
              {saving ? "Saving…" : "Create PIP"}
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
              <div className="flex flex-1 gap-2">
                <Input value={resNotes} onChange={(e) => setResNotes(e.target.value)} placeholder="Resolution notes…" className="h-7 text-xs" />
                <Button size="sm" className="h-7 text-xs bg-[#003087] hover:bg-[#002266]" onClick={() => { onResolve(c.id, resNotes); setShowResolve(false); }}>
                  Confirm
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function PipCard({ pip, onClose }: { pip: PipRow; onClose: (id: string, status: "closed" | "failed", notes: string) => void }) {
  const [notes, setNotes] = useState("");
  return (
    <Card className={pip.status !== "open" ? "opacity-60" : ""}>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#003087]" />
            <span className="font-semibold text-gray-900">
              {pip.cadet?.rank ? `${pip.cadet.rank} ` : ""}{pip.cadet?.full_name ?? "Unknown"}
            </span>
            <Badge className={pip.status === "open" ? "bg-amber-100 text-amber-800" : pip.status === "closed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
              {pip.status.charAt(0).toUpperCase() + pip.status.slice(1)}
            </Badge>
          </div>
          <span className="text-xs text-gray-400">Opened {format(new Date(pip.opened_at), "MMM d, yyyy")}</span>
        </div>
        <div className="space-y-1 text-sm text-gray-700">
          <p><span className="font-medium">Root Cause:</span> {pip.root_cause}</p>
          {pip.timeline && <p><span className="font-medium">Timeline:</span> {pip.timeline}</p>}
          {pip.goals && <p><span className="font-medium">Goals:</span> {pip.goals}</p>}
        </div>
        {pip.status === "open" && (
          <div className="flex gap-2 pt-1">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Outcome notes…" className="h-8 text-xs" />
            <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => onClose(pip.id, "closed", notes)}>Close</Button>
            <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={() => onClose(pip.id, "failed", notes)}>Failed</Button>
          </div>
        )}
        {pip.outcome_notes && <p className="text-xs text-gray-500 italic">Outcome: {pip.outcome_notes}</p>}
      </div>
    </Card>
  );
}
