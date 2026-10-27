"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckSquare, Square, ChevronDown } from "lucide-react";
import { initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const RANK_ORDER = ["SR", "SA", "SN", "PO3", "PO2", "PO1", "CPO"];

type CadetRow = { id: string; full_name: string; rank: string | null; role: string };

export function BulkRankClient({ cadets }: { cadets: CadetRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newRank, setNewRank] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = cadets.filter((c) =>
    !search ||
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.rank ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  const toggleAll = () =>
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id)));

  const apply = async () => {
    if (!newRank || selected.size === 0) return;
    setSaving(true);
    const supabase = createClient();
    const ids = Array.from(selected);
    const { error } = await supabase
      .from("profiles")
      .update({ rank: newRank, date_of_rank: new Date().toISOString().split("T")[0] } as never)
      .in("id", ids);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    // Notify each cadet
    await supabase.from("notifications").insert(
      ids.map((id) => ({
        profile_id: id,
        type: "rank_advance" as const,
        title: `Congratulations — you've advanced to ${newRank}`,
        body: "Your rank has been updated in the portal. Well done.",
      }))
    );
    toast.success(`Rank updated to ${newRank} for ${ids.length} cadet${ids.length !== 1 ? "s" : ""}`);
    setSelected(new Set());
    setNewRank("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cadets…"
          className="h-9 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30 flex-1 min-w-[160px]"
        />
        <div className="relative">
          <select
            value={newRank}
            onChange={(e) => setNewRank(e.target.value)}
            className="h-9 appearance-none rounded-lg border pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30 bg-white"
          >
            <option value="">Select new rank…</option>
            {RANK_ORDER.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
        </div>
        <Button
          onClick={apply}
          disabled={saving || selected.size === 0 || !newRank}
          className="bg-[#003087] hover:bg-[#002266]"
          size="sm"
        >
          {saving ? "Updating…" : `Apply to ${selected.size} selected`}
        </Button>
      </div>

      <Card>
        <div
          className="flex items-center gap-3 border-b px-4 py-2.5 cursor-pointer hover:bg-gray-50"
          onClick={toggleAll}
        >
          {selected.size === filtered.length && filtered.length > 0
            ? <CheckSquare className="h-4 w-4 text-[#003087]" />
            : <Square className="h-4 w-4 text-gray-300" />}
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Select all ({filtered.length})
          </span>
        </div>

        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">No cadets found</div>
        )}

        {filtered.map((cadet) => {
          const isSelected = selected.has(cadet.id);
          return (
            <div
              key={cadet.id}
              onClick={() => toggle(cadet.id)}
              className={`flex cursor-pointer items-center gap-3 border-b px-4 py-3 last:border-b-0 transition-colors ${
                isSelected ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
            >
              {isSelected
                ? <CheckSquare className="h-4 w-4 shrink-0 text-[#003087]" />
                : <Square className="h-4 w-4 shrink-0 text-gray-300" />}
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-[#003087] text-[10px] text-white">
                  {initials(cadet.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{cadet.full_name}</p>
              </div>
              <Badge variant="outline" className="shrink-0 font-mono text-xs">
                {cadet.rank ?? "—"}
              </Badge>
              {isSelected && newRank && (
                <span className="shrink-0 text-xs font-semibold text-[#003087]">→ {newRank}</span>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
