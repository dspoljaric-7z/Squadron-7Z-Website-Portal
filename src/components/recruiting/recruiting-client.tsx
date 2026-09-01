"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, UserPlus, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PROSPECT_STAGE_LABELS, PROSPECT_STAGE_COLORS } from "@/lib/constants";
import type { Profile, RecruitingProspect, ProspectStage } from "@/types/database";

type ProspectRow = RecruitingProspect & { assigned: { full_name: string } | null };

const STAGES: ProspectStage[] = ["prospect", "contacted", "interested", "applied", "enrolled", "inactive"];

export function RecruitingClient({ initialProspects, profile }: { initialProspects: ProspectRow[]; profile: Profile }) {
  const [prospects, setProspects] = useState(initialProspects);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", age: "", contact_email: "", contact_phone: "",
    guardian_name: "", guardian_contact: "", referred_from: "", notes: "",
  });

  const funnel = useMemo(() => {
    const counts: Record<ProspectStage, number> = { prospect: 0, contacted: 0, interested: 0, applied: 0, enrolled: 0, inactive: 0 };
    for (const p of prospects) counts[p.stage]++;
    return counts;
  }, [prospects]);

  const createProspect = async () => {
    if (!form.name) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("recruiting_prospects")
      .insert({
        name: form.name,
        age: form.age ? parseInt(form.age) : null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        guardian_name: form.guardian_name || null,
        guardian_contact: form.guardian_contact || null,
        referred_from: form.referred_from || null,
        notes: form.notes || null,
        assigned_to: profile.id,
        stage: "prospect",
      })
      .select("*, assigned:profiles!recruiting_prospects_assigned_to_fkey(full_name)")
      .single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setProspects((prev) => [data as unknown as ProspectRow, ...prev]);
    setShowNew(false);
    setForm({ name: "", age: "", contact_email: "", contact_phone: "", guardian_name: "", guardian_contact: "", referred_from: "", notes: "" });
    toast.success("Prospect added");
  };

  const updateStage = async (id: string, stage: ProspectStage) => {
    const supabase = createClient();
    await supabase.from("recruiting_prospects").update({ stage, updated_at: new Date().toISOString() }).eq("id", id);
    setProspects((prev) => prev.map((p) => p.id === id ? { ...p, stage } : p));
  };

  const activeProspects = prospects.filter((p) => p.stage !== "inactive");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#003087]" />
            <h1 className="text-xl font-bold text-gray-900">Recruiting</h1>
          </div>
          <p className="text-sm text-gray-500">{funnel.enrolled} enrolled · {activeProspects.length} in pipeline</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="bg-[#003087] hover:bg-[#002266]" size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Add Prospect
        </Button>
      </div>

      {/* Funnel view */}
      <Card className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Funnel</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["prospect", "contacted", "interested", "applied", "enrolled"] as ProspectStage[]).map((stage) => (
            <div key={stage} className="shrink-0 text-center">
              <div className={`inline-flex h-8 min-w-12 items-center justify-center rounded-lg px-3 text-sm font-bold ${PROSPECT_STAGE_COLORS[stage]}`}>
                {funnel[stage]}
              </div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">{stage}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Pipeline columns */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(["prospect", "contacted", "interested", "applied", "enrolled"] as ProspectStage[]).map((stage) => {
          const inStage = prospects.filter((p) => p.stage === stage);
          return (
            <div key={stage} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={PROSPECT_STAGE_COLORS[stage]}>{PROSPECT_STAGE_LABELS[stage]}</Badge>
                <span className="text-xs text-gray-400">{inStage.length}</span>
              </div>
              {inStage.map((p) => (
                <Card key={p.id} className="p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                      {p.age && <p className="text-xs text-gray-500">Age {p.age}</p>}
                      {p.contact_email && <p className="text-xs text-gray-500">{p.contact_email}</p>}
                      {p.contact_phone && <p className="text-xs text-gray-500">{p.contact_phone}</p>}
                      {p.referred_from && <p className="text-xs text-gray-400">Via: {p.referred_from}</p>}
                      {p.notes && <p className="text-xs text-gray-400 italic">{p.notes}</p>}
                      {p.follow_up_date && <p className="text-xs text-amber-600">Follow up {format(new Date(p.follow_up_date), "MMM d")}</p>}
                    </div>
                  </div>
                  <Select value={p.stage} onValueChange={(v) => updateStage(p.id, v as ProspectStage)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => <SelectItem key={s} value={s}>{PROSPECT_STAGE_LABELS[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Card>
              ))}
            </div>
          );
        })}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Prospect</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { key: "name", label: "Name *", placeholder: "Full name" },
              { key: "age", label: "Age", placeholder: "e.g. 14", type: "number" },
              { key: "contact_email", label: "Email", placeholder: "prospect@email.com" },
              { key: "contact_phone", label: "Phone", placeholder: "555-555-5555" },
              { key: "guardian_name", label: "Guardian Name", placeholder: "Parent/guardian" },
              { key: "guardian_contact", label: "Guardian Contact", placeholder: "Phone or email" },
              { key: "referred_from", label: "Referred From", placeholder: "Drill visit, website…" },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input type={type} value={(form as Record<string, string>)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} />
              </div>
            ))}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={createProspect} disabled={saving || !form.name} className="bg-[#003087] hover:bg-[#002266]">
              {saving ? "Adding…" : "Add Prospect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
