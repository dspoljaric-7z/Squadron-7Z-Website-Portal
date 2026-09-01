"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Zap } from "lucide-react";
import { toast } from "sonner";
import { QUAL_TYPES, QUAL_STATUS_LABELS, QUAL_STATUS_COLORS } from "@/lib/constants";
import { isSeniorStaff } from "@/lib/permissions";
import { initials } from "@/lib/format";
import type { Profile, Qualification, QualStatus } from "@/types/database";

type CadetRow = { id: string; full_name: string; rank: string | null; billet: string | null; division_id: string | null; role: string };
type QualMap = Map<string, Map<string, QualStatus>>; // cadetId → qualType → status

export function QualificationsClient({
  cadets,
  initialQuals,
  profile,
}: {
  cadets: CadetRow[];
  initialQuals: Qualification[];
  profile: Profile;
}) {
  const canEdit = isSeniorStaff(profile);

  const [qualMap, setQualMap] = useState<QualMap>(() => {
    const m = new Map<string, Map<string, QualStatus>>();
    for (const q of initialQuals) {
      if (!m.has(q.cadet_id)) m.set(q.cadet_id, new Map());
      m.get(q.cadet_id)!.set(q.qual_type, q.status);
    }
    return m;
  });

  const [searchQ, setSearchQ] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

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
      return next;
    });
  };

  const [bulkQual, setBulkQual] = useState<string>("");
  const [bulkStatus, setBulkStatus] = useState<QualStatus>("completed");
  const [bulkSaving, setBulkSaving] = useState(false);

  const getStatus = (cadetId: string, qualType: string): QualStatus =>
    qualMap.get(cadetId)?.get(qualType) ?? "not_started";

  const completedCount = (cadetId: string) =>
    QUAL_TYPES.filter((q) => getStatus(cadetId, q) === "completed").length;

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
          <p className="text-sm text-gray-500">{cadets.length} cadets · {QUAL_TYPES.length} qual types</p>
        </div>
      </div>

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
              {QUAL_TYPES.map((qt) => (
                <SelectItem key={qt} value={qt}>{qt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={bulkStatus} onValueChange={(v) => setBulkStatus((v ?? "not_started") as QualStatus)}>
            <SelectTrigger className="h-8 w-36 text-xs bg-white">
              <SelectValue />
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
                <Badge variant="outline" className={done === QUAL_TYPES.length ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50"}>
                  <CheckSquare className="mr-1 h-3 w-3" />
                  {done}/{QUAL_TYPES.length}
                </Badge>
              </div>

              <div className="grid gap-2 p-3 sm:grid-cols-2">
                {QUAL_TYPES.map((qt) => {
                  const status = getStatus(cadet.id, qt);
                  const key = `${cadet.id}-${qt}`;
                  return (
                    <div key={qt} className="flex items-center justify-between gap-2 rounded border bg-white p-2">
                      <span className="text-sm text-gray-700">{qt}</span>
                      {canEdit ? (
                        <Select
                          value={status}
                          onValueChange={(v) => updateQual(cadet.id, qt, v as QualStatus)}
                          disabled={saving === key}
                        >
                          <SelectTrigger className="h-7 w-36 text-xs">
                            <SelectValue />
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
