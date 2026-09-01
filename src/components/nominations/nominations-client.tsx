"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { isCommand } from "@/lib/permissions";
import { NOMINATION_STAGE_LABELS, NOMINATION_STAGE_COLORS, BILLET_OPTIONS } from "@/lib/constants";
import type { Profile, BilletNomination, NominationStage } from "@/types/database";

type NominationRow = BilletNomination & {
  cadet: { full_name: string; rank: string | null } | null;
  nominator: { full_name: string } | null;
  approver: { full_name: string } | null;
};

const STAGES: NominationStage[] = ["nominated", "applied", "interviewed", "approved_probation", "confirmed", "not_selected"];

export function NominationsClient({
  initialNominations,
  cadets,
  profile,
}: {
  initialNominations: NominationRow[];
  cadets: { id: string; full_name: string; rank: string | null }[];
  billets?: { id: string; name: string }[];
  profile: Profile;
}) {
  const [nominations, setNominations] = useState(initialNominations);
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pipBlock, setPipBlock] = useState<string | null>(null);
  const [form, setForm] = useState({
    cadet_id: "",
    billet_name: "",
    billet_id: "",
    notes: "",
    probation_end_date: "",
  });

  const canApprove = isCommand(profile);

  const checkPip = async (cadetId: string) => {
    if (!cadetId) { setPipBlock(null); return; }
    const supabase = createClient();
    const { data } = await supabase.from("pips").select("id").eq("cadet_id", cadetId).eq("status", "open").limit(1);
    if (data && data.length > 0) {
      const cadet = cadets.find((c) => c.id === cadetId);
      setPipBlock(`${cadet?.full_name ?? "This cadet"} has an open PIP and is ineligible for a new billet (Correction Manual §2.3).`);
    } else {
      setPipBlock(null);
    }
  };

  const createNomination = async () => {
    if (!form.cadet_id || !form.billet_name) return;
    if (pipBlock) { toast.error("Cannot nominate: open PIP exists."); return; }
    setCreating(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("billet_nominations")
      .insert({
        cadet_id: form.cadet_id,
        billet_name: form.billet_name,
        billet_id: form.billet_id || null,
        notes: form.notes || null,
        nominated_by: profile.id,
        probation_end_date: form.probation_end_date || null,
      })
      .select("*, cadet:profiles!billet_nominations_cadet_id_fkey(full_name, rank), nominator:profiles!billet_nominations_nominated_by_fkey(full_name), approver:profiles!billet_nominations_approved_by_fkey(full_name)")
      .single();
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    setNominations((prev) => [data as unknown as NominationRow, ...prev]);
    setShowNew(false);
    setForm({ cadet_id: "", billet_name: "", billet_id: "", notes: "", probation_end_date: "" });
    toast.success("Nomination created");
  };

  const updateStage = async (id: string, stage: NominationStage) => {
    if (!canApprove) return;
    const supabase = createClient();
    const updates: Record<string, unknown> = { stage, updated_at: new Date().toISOString() };
    if (stage === "approved_probation" || stage === "confirmed") {
      updates.approved_by = profile.id;
    }
    const { error } = await supabase.from("billet_nominations").update(updates as never).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setNominations((prev) => prev.map((n) => n.id === id ? { ...n, stage, ...updates } as unknown as NominationRow : n));
    toast.success("Stage updated");
  };

  const active = nominations.filter((n) => !["confirmed", "not_selected"].includes(n.stage));
  const completed = nominations.filter((n) => ["confirmed", "not_selected"].includes(n.stage));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nominations & Promotions</h1>
          <p className="text-sm text-gray-500">{active.length} active pipeline{active.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="bg-[#003087] hover:bg-[#002266]" size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Nominate
        </Button>
      </div>

      {/* Pipeline */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(["nominated", "applied", "interviewed", "approved_probation"] as NominationStage[]).map((stage) => {
          const inStage = active.filter((n) => n.stage === stage);
          return (
            <div key={stage} className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge className={NOMINATION_STAGE_COLORS[stage]}>{NOMINATION_STAGE_LABELS[stage]}</Badge>
                <span className="text-xs text-gray-400">{inStage.length}</span>
              </div>
              {inStage.map((n) => (
                <Card key={n.id} className="p-3 space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {n.cadet?.rank ? `${n.cadet.rank} ` : ""}{n.cadet?.full_name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-gray-500">{n.billet_name}</p>
                    {n.probation_end_date && (
                      <p className="text-xs text-amber-600">Probation ends {format(new Date(n.probation_end_date), "MMM d")}</p>
                    )}
                    {n.notes && <p className="text-xs text-gray-400 italic">{n.notes}</p>}
                  </div>
                  {canApprove && (
                    <Select value={n.stage} onValueChange={(v) => updateStage(n.id, v as NominationStage)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STAGES.map((s) => (
                          <SelectItem key={s} value={s}>{NOMINATION_STAGE_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </Card>
              ))}
              {inStage.length === 0 && (
                <div className="rounded-lg border border-dashed p-3 text-center text-xs text-gray-400">Empty</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">Completed</h2>
          <div className="space-y-1">
            {completed.slice(0, 10).map((n) => (
              <div key={n.id} className="flex items-center justify-between rounded border bg-white px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{n.cadet?.full_name}</span>
                  <span className="text-gray-500"> → {n.billet_name}</span>
                </div>
                <Badge className={NOMINATION_STAGE_COLORS[n.stage]}>{NOMINATION_STAGE_LABELS[n.stage]}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New nomination dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Nomination</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cadet *</Label>
              <Select value={form.cadet_id} onValueChange={(v) => { setForm({ ...form, cadet_id: v ?? "" }); checkPip(v ?? ""); }}>
                <SelectTrigger><SelectValue placeholder="Select cadet…" /></SelectTrigger>
                <SelectContent>
                  {cadets.map((c) => <SelectItem key={c.id} value={c.id}>{c.rank ? `${c.rank} ` : ""}{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {pipBlock && (
              <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {pipBlock}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Billet *</Label>
              <Select value={form.billet_name} onValueChange={(v) => setForm({ ...form, billet_name: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Select billet…" /></SelectTrigger>
                <SelectContent>
                  {BILLET_OPTIONS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Probation End Date</Label>
              <Input type="date" value={form.probation_end_date} onChange={(e) => setForm({ ...form, probation_end_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button
              onClick={createNomination}
              disabled={creating || !form.cadet_id || !form.billet_name || !!pipBlock}
              className="bg-[#003087] hover:bg-[#002266]"
            >
              {creating ? "Creating…" : "Create Nomination"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
