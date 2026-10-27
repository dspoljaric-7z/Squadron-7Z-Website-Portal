"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckSquare, Zap, Settings, Trash2, Plus, ChevronUp, ChevronDown, AlertTriangle, GripVertical, Clock, Infinity as InfinityIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { QUAL_TYPES, QUAL_STATUS_LABELS, QUAL_STATUS_COLORS } from "@/lib/constants";
import { isSeniorStaff } from "@/lib/permissions";
import { initials } from "@/lib/format";
import { addQualType, deactivateQualType, updateQualTypeOrder, updateQualTypePrerequisites, notifyQualCompletion } from "@/app/(app)/settings/actions";
import type { Profile, Qualification, QualStatus } from "@/types/database";
import { isAfter, addDays, parseISO, format } from "date-fns";

type CadetRow = { id: string; full_name: string; rank: string | null; billet: string | null; division_id: string | null; role: string };
type QualMap = Map<string, Map<string, QualStatus>>; // cadetId → qualType → status
type QualExpiry = { expires_at: string | null; never_expires: boolean };
type QualExpiryMap = Map<string, Map<string, QualExpiry>>; // cadetId → qualType → expiry
type QualTypeDetail = { name: string; prerequisites: string[] };

export function QualificationsClient({
  cadets,
  initialQuals,
  profile,
  qualTypes = QUAL_TYPES,
  qualTypeDetails = [],
}: {
  cadets: CadetRow[];
  initialQuals: Qualification[];
  profile: Profile;
  qualTypes?: string[];
  qualTypeDetails?: QualTypeDetail[];
}) {
  const canEdit = isSeniorStaff(profile);
  const router = useRouter();

  const [qualMap, setQualMap] = useState<QualMap>(() => {
    const m = new Map<string, Map<string, QualStatus>>();
    for (const q of initialQuals) {
      if (!m.has(q.cadet_id)) m.set(q.cadet_id, new Map());
      m.get(q.cadet_id)!.set(q.qual_type, q.status);
    }
    return m;
  });

  const [expiryMap, setExpiryMap] = useState<QualExpiryMap>(() => {
    const m = new Map<string, Map<string, QualExpiry>>();
    for (const q of initialQuals) {
      if (q.expires_at || q.never_expires) {
        if (!m.has(q.cadet_id)) m.set(q.cadet_id, new Map());
        m.get(q.cadet_id)!.set(q.qual_type, { expires_at: q.expires_at ?? null, never_expires: q.never_expires ?? false });
      }
    }
    return m;
  });
  const [editingExpiry, setEditingExpiry] = useState<string | null>(null); // "cadetId-qualType"
  const [expiryForm, setExpiryForm] = useState<{ expires_at: string; never_expires: boolean }>({ expires_at: "", never_expires: false });
  const [savingExpiry, setSavingExpiry] = useState(false);

  const saveExpiry = async (cadetId: string, qualType: string) => {
    setSavingExpiry(true);
    const supabase = createClient();
    const { error } = await supabase.from("qualifications").update({
      expires_at: expiryForm.never_expires ? null : (expiryForm.expires_at || null),
      never_expires: expiryForm.never_expires,
    }).eq("cadet_id", cadetId).eq("qual_type", qualType);
    setSavingExpiry(false);
    if (error) { toast.error("Failed to save expiry"); return; }
    setExpiryMap((prev) => {
      const next = new Map(prev);
      if (!next.has(cadetId)) next.set(cadetId, new Map());
      next.get(cadetId)!.set(qualType, { expires_at: expiryForm.never_expires ? null : (expiryForm.expires_at || null), never_expires: expiryForm.never_expires });
      return next;
    });
    setEditingExpiry(null);
    toast.success("Expiry saved");
  };

  const [searchQ, setSearchQ] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [showManage, setShowManage] = useState(false);
  const [manageTypes, setManageTypes] = useState<{ id: string; name: string; prerequisites: string[] }[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [addingType, setAddingType] = useState(false);
  const [editingPrereqFor, setEditingPrereqFor] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const reloadManageTypes = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("qual_types").select("id, name, prerequisites").eq("active", true).order("sort_order");
    setManageTypes((data as { id: string; name: string; prerequisites: string[] | null }[]).map((t) => ({ ...t, prerequisites: t.prerequisites ?? [] })) ?? []);
  };

  const openManage = async () => {
    setShowManage(true);
    setLoadingTypes(true);
    await reloadManageTypes();
    setLoadingTypes(false);
  };

  const handleAddType = async () => {
    if (!newTypeName.trim()) return;
    setAddingType(true);
    const res = await addQualType(newTypeName);
    setAddingType(false);
    if (res.error) { toast.error(res.error); return; }
    setNewTypeName("");
    toast.success("Qual type added");
    router.refresh();
    await reloadManageTypes();
  };

  const handleRemoveType = async (id: string) => {
    const res = await deactivateQualType(id);
    if (res.error) { toast.error(res.error); return; }
    setManageTypes((prev) => prev.filter((t) => t.id !== id));
    toast.success("Qual type deactivated");
    router.refresh();
  };

  const moveType = async (index: number, direction: "up" | "down") => {
    const newTypes = [...manageTypes];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newTypes.length) return;
    [newTypes[index], newTypes[swapIndex]] = [newTypes[swapIndex], newTypes[index]];
    setManageTypes(newTypes);
    setSavingOrder(true);
    await updateQualTypeOrder(newTypes.map((t, i) => ({ id: t.id, sort_order: i + 1 })));
    setSavingOrder(false);
    router.refresh();
  };

  const handleSavePrereqs = async (id: string, prereqs: string[]) => {
    const res = await updateQualTypePrerequisites(id, prereqs);
    if (res.error) { toast.error(res.error); return; }
    setManageTypes((prev) => prev.map((t) => t.id === id ? { ...t, prerequisites: prereqs } : t));
    setEditingPrereqFor(null);
    toast.success("Prerequisites updated");
    router.refresh();
  };

  const filteredCadets = useMemo(() => {
    if (!searchQ) return cadets;
    const q = searchQ.toLowerCase();
    return cadets.filter((c) => c.full_name.toLowerCase().includes(q));
  }, [cadets, searchQ]);

  const updateQual = async (cadetId: string, qualType: string, status: QualStatus) => {
    const key = `${cadetId}-${qualType}`;
    setSaving(key);

    const supabase = createClient();
    const { error } = await supabase.from("qualifications").upsert({
      cadet_id: cadetId,
      qual_type: qualType,
      status,
      recorded_by: profile.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "cadet_id,qual_type" });

    setSaving(null);
    if (error) { toast.error("Failed to save"); return; }

    setQualMap((prev) => {
      const next = new Map(prev);
      if (!next.has(cadetId)) next.set(cadetId, new Map());
      next.get(cadetId)!.set(qualType, status);

      // Check for 100% completion
      if (status === "completed") {
        const allDone = qualTypes.every((qt) =>
          qt === qualType ? true : (next.get(cadetId)?.get(qt) === "completed")
        );
        if (allDone && qualTypes.length > 0) {
          notifyQualCompletion(cadetId).catch(() => null);
          toast.success("100% complete! Cadet notified.");
        }
      }

      return next;
    });
  };

  const [bulkQual, setBulkQual] = useState<string>("");
  const [bulkStatus, setBulkStatus] = useState<QualStatus>("completed");
  const [bulkSaving, setBulkSaving] = useState(false);

  const getStatus = (cadetId: string, qualType: string): QualStatus =>
    qualMap.get(cadetId)?.get(qualType) ?? "not_started";

  const completedCount = (cadetId: string) =>
    qualTypes.filter((q) => getStatus(cadetId, q) === "completed").length;

  const getUnmetPrerequisites = (cadetId: string, qualType: string): string[] => {
    const detail = qualTypeDetails.find((d) => d.name === qualType);
    if (!detail || !detail.prerequisites.length) return [];
    return detail.prerequisites.filter((prereq) => getStatus(cadetId, prereq) !== "completed");
  };

  const bulkUpdate = async () => {
    if (!bulkQual) return;
    setBulkSaving(true);
    const supabase = createClient();
    const rows = filteredCadets.map((c) => ({
      cadet_id: c.id,
      qual_type: bulkQual,
      status: bulkStatus,
      recorded_by: profile.id,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("qualifications")
      .upsert(rows, { onConflict: "cadet_id,qual_type" });
    setBulkSaving(false);
    if (error) { toast.error("Bulk update failed"); return; }
    setQualMap((prev) => {
      const next = new Map(prev);
      filteredCadets.forEach((c) => {
        if (!next.has(c.id)) next.set(c.id, new Map());
        next.get(c.id)!.set(bulkQual, bulkStatus);
      });
      return next;
    });
    toast.success(`Updated ${filteredCadets.length} cadets — ${bulkQual} → ${QUAL_STATUS_LABELS[bulkStatus]}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Qualifications</h1>
          <p className="text-sm text-gray-500">{cadets.length} cadets · {qualTypes.length} qual types</p>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={openManage} className="gap-1.5">
            <Settings className="h-3.5 w-3.5" /> Manage Types
          </Button>
        )}
      </div>

      <Dialog open={showManage} onOpenChange={(o) => { setShowManage(o); if (!o) setEditingPrereqFor(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Manage Qual Types</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {loadingTypes ? (
              <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
            ) : manageTypes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No active qual types.</p>
            ) : (
              manageTypes.map((t, idx) => (
                <div key={t.id} className="rounded border bg-gray-50 px-3 py-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                    <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{t.name}</span>
                    {t.prerequisites.length > 0 && (
                      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 shrink-0">
                        {t.prerequisites.length} prereq{t.prerequisites.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => moveType(idx, "up")}
                        disabled={idx === 0 || savingOrder}
                        className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Move up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveType(idx, "down")}
                        disabled={idx === manageTypes.length - 1 || savingOrder}
                        className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Move down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingPrereqFor(editingPrereqFor === t.id ? null : t.id)}
                        className={`text-xs px-1.5 py-0.5 rounded border ${editingPrereqFor === t.id ? "bg-blue-50 border-blue-200 text-blue-700" : "border-gray-200 text-gray-500 hover:text-gray-700"}`}
                        title="Edit prerequisites"
                      >
                        Prereqs
                      </button>
                      <button
                        onClick={() => handleRemoveType(t.id)}
                        className="text-red-400 hover:text-red-600 ml-1"
                        title="Deactivate"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {editingPrereqFor === t.id && (
                    <PrereqEditor
                      typeId={t.id}
                      typeName={t.name}
                      allTypes={manageTypes}
                      currentPrereqs={t.prerequisites}
                      onSave={handleSavePrereqs}
                      onCancel={() => setEditingPrereqFor(null)}
                    />
                  )}
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">New Qual Type</Label>
              <Input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="e.g. Navigation Charts"
                onKeyDown={(e) => { if (e.key === "Enter") handleAddType(); }}
              />
            </div>
            <div className="flex items-end">
              <Button size="sm" onClick={handleAddType} disabled={addingType || !newTypeName.trim()} className="bg-[#003087] hover:bg-[#002266]">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManage(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Input placeholder="Search cadets…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} className="h-10 max-w-sm" />

      {canEdit && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-amber-50 border-amber-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">Bulk Update</span>
          </div>
          <Select value={bulkQual} onValueChange={(v) => setBulkQual(v ?? "")}>
            <SelectTrigger className="h-8 w-52 text-xs bg-white">
              <SelectValue placeholder="Select qual type…" />
            </SelectTrigger>
            <SelectContent>
              {qualTypes.map((qt) => (
                <SelectItem key={qt} value={qt}>{qt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={bulkStatus} onValueChange={(v) => setBulkStatus((v ?? "not_started") as QualStatus)}>
            <SelectTrigger className="h-8 w-36 text-xs bg-white">
              <SelectValue>{QUAL_STATUS_LABELS[bulkStatus]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(QUAL_STATUS_LABELS) as [QualStatus, string][]).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!bulkQual || bulkSaving || filteredCadets.length === 0}
            onClick={bulkUpdate}
            className="h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs"
          >
            {bulkSaving ? "Saving…" : `Apply to ${filteredCadets.length} cadet${filteredCadets.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {filteredCadets.map((cadet) => {
          const done = completedCount(cadet.id);
          return (
            <Card key={cadet.id} className="overflow-hidden">
              <div className="flex items-center gap-3 border-b bg-gray-50 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#003087] text-sm font-bold text-white">
                  {initials(cadet.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">
                    {cadet.rank ? `${cadet.rank} ` : ""}{cadet.full_name}
                  </p>
                  {cadet.billet && <p className="text-xs text-gray-500">{cadet.billet}</p>}
                </div>
                <Badge variant="outline" className={done === qualTypes.length ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50"}>
                  <CheckSquare className="mr-1 h-3 w-3" />
                  {done}/{qualTypes.length}
                </Badge>
              </div>

              <div className="grid gap-2 p-3 sm:grid-cols-2">
                {qualTypes.map((qt) => {
                  const status = getStatus(cadet.id, qt);
                  const key = `${cadet.id}-${qt}`;
                  const unmetPrereqs = canEdit ? getUnmetPrerequisites(cadet.id, qt) : [];
                  const expiry = expiryMap.get(cadet.id)?.get(qt);
                  const isExpired = expiry?.expires_at && !isAfter(parseISO(expiry.expires_at), new Date());
                  const expiringSoon = expiry?.expires_at && !expiry.never_expires && isAfter(parseISO(expiry.expires_at), new Date()) && !isAfter(parseISO(expiry.expires_at), addDays(new Date(), 30));
                  const isEditingThisExpiry = editingExpiry === key;
                  return (
                    <div key={qt} className={`rounded border bg-white p-2 space-y-1.5 ${isExpired ? "border-red-300 bg-red-50" : expiringSoon ? "border-amber-300 bg-amber-50" : ""}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 min-w-0">
                          {unmetPrereqs.length > 0 && (
                            <span title={`Requires: ${unmetPrereqs.join(", ")}`} className="shrink-0">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            </span>
                          )}
                          <span className="text-sm text-gray-700 truncate">{qt}</span>
                        </div>
                        {canEdit ? (
                          <Select
                            value={status}
                            onValueChange={(v) => updateQual(cadet.id, qt, v as QualStatus)}
                            disabled={saving === key}
                          >
                            <SelectTrigger className="h-7 w-36 text-xs shrink-0">
                              <SelectValue>{QUAL_STATUS_LABELS[status]}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.entries(QUAL_STATUS_LABELS) as [QualStatus, string][]).map(([k, label]) => (
                                <SelectItem key={k} value={k}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={QUAL_STATUS_COLORS[status]} variant="outline">
                            {QUAL_STATUS_LABELS[status]}
                          </Badge>
                        )}
                      </div>
                      {status === "completed" && (
                        <div className="flex items-center justify-between gap-2">
                          <span className={`flex items-center gap-1 text-[11px] ${isExpired ? "text-red-600 font-semibold" : expiringSoon ? "text-amber-600 font-semibold" : "text-gray-400"}`}>
                            {expiry?.never_expires ? (
                              <><InfinityIcon className="h-3 w-3 text-green-500" /> Never expires</>
                            ) : expiry?.expires_at ? (
                              <><Clock className="h-3 w-3" />{isExpired ? "Expired" : "Exp."} {format(parseISO(expiry.expires_at), "MMM d, yy")}</>
                            ) : (
                              <span className="italic">No expiry</span>
                            )}
                          </span>
                          {canEdit && (
                            <button
                              onClick={() => { setEditingExpiry(isEditingThisExpiry ? null : key); setExpiryForm({ expires_at: expiry?.expires_at ?? "", never_expires: expiry?.never_expires ?? false }); }}
                              className="text-[11px] text-[#003087] hover:underline shrink-0"
                            >
                              {isEditingThisExpiry ? "Cancel" : "Set expiry"}
                            </button>
                          )}
                        </div>
                      )}
                      {isEditingThisExpiry && (
                        <div className="rounded border border-[#003087]/20 bg-blue-50 p-2 space-y-2">
                          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                            <Checkbox
                              checked={expiryForm.never_expires}
                              onCheckedChange={(v) => setExpiryForm((f) => ({ ...f, never_expires: !!v, expires_at: v ? "" : f.expires_at }))}
                            />
                            Never expires
                          </label>
                          {!expiryForm.never_expires && (
                            <Input type="date" value={expiryForm.expires_at} onChange={(e) => setExpiryForm((f) => ({ ...f, expires_at: e.target.value }))} className="h-7 text-xs" />
                          )}
                          <Button size="sm" className="h-7 text-xs bg-[#003087] hover:bg-[#002266]" onClick={() => saveExpiry(cadet.id, qt)} disabled={savingExpiry}>
                            {savingExpiry ? "Saving…" : "Save"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function PrereqEditor({
  typeId,
  typeName,
  allTypes,
  currentPrereqs,
  onSave,
  onCancel,
}: {
  typeId: string;
  typeName: string;
  allTypes: { id: string; name: string }[];
  currentPrereqs: string[];
  onSave: (id: string, prereqs: string[]) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(currentPrereqs);
  const [saving, setSaving] = useState(false);

  const toggle = (name: string) => {
    setSelected((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(typeId, selected);
    setSaving(false);
  };

  return (
    <div className="border-t pt-2 space-y-2">
      <p className="text-xs font-medium text-gray-500">Prerequisites for <span className="text-gray-800">{typeName}</span>:</p>
      <div className="grid grid-cols-2 gap-1">
        {allTypes.filter((t) => t.id !== typeId).map((t) => (
          <label key={t.id} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
            <Checkbox
              checked={selected.includes(t.name)}
              onCheckedChange={() => toggle(t.name)}
            />
            {t.name}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#003087] hover:bg-[#002266] h-7 text-xs">
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="h-7 text-xs">Cancel</Button>
      </div>
    </div>
  );
}
