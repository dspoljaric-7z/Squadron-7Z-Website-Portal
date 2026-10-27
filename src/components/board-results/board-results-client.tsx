"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy, Plus, Trash2, Search } from "lucide-react";
import { initials, lastFirst, byLastName } from "@/lib/format";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import type { BoardResultRow, Profile } from "@/types/database";

type ResultWithNames = BoardResultRow & {
  cadet: { full_name: string; rank: string | null } | null;
  poster: { full_name: string; rank: string | null } | null;
};

type CadetRow = { id: string; full_name: string; rank: string | null; role: string };

const RESULT_LABELS: Record<string, string> = {
  recommended: "Recommended",
  not_recommended: "Not Recommended",
  deferred: "Deferred",
};

const RESULT_COLORS: Record<string, string> = {
  recommended: "bg-green-100 text-green-800 border-green-300",
  not_recommended: "bg-red-100 text-red-800 border-red-300",
  deferred: "bg-amber-100 text-amber-800 border-amber-300",
};

const EMPTY_FORM = {
  cadet_id: "",
  board_date: new Date().toISOString().split("T")[0],
  from_rank: "",
  to_rank: "",
  result: "recommended" as "recommended" | "not_recommended" | "deferred",
  notes: "",
};

export function BoardResultsClient({
  profile,
  initialResults,
  cadets,
  canPost,
}: {
  profile: Profile;
  initialResults: ResultWithNames[];
  cadets: CadetRow[];
  canPost: boolean;
}) {
  const [results, setResults] = useState<ResultWithNames[]>(initialResults);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const sortedCadets = useMemo(() => [...cadets].sort(byLastName), [cadets]);

  const filtered = useMemo(() => {
    if (!query.trim()) return results;
    const q = query.toLowerCase();
    return results.filter(
      (r) =>
        r.cadet?.full_name.toLowerCase().includes(q) ||
        (r.from_rank ?? "").toLowerCase().includes(q) ||
        (r.to_rank ?? "").toLowerCase().includes(q)
    );
  }, [results, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, ResultWithNames[]>();
    [...filtered].forEach((r) => {
      const key = r.board_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const save = async () => {
    if (!form.cadet_id || !form.board_date) {
      toast.error("Cadet and board date are required");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (supabase.from("board_results") as any)
      .insert({
        cadet_id: form.cadet_id,
        board_date: form.board_date,
        from_rank: form.from_rank || null,
        to_rank: form.to_rank || null,
        result: form.result,
        notes: form.notes || null,
        posted_by: profile.id,
      })
      .select("*, cadet:profiles!board_results_cadet_id_fkey(full_name, rank), poster:profiles!board_results_posted_by_fkey(full_name, rank)")
      .single();
    const { data, error } = res as { data: ResultWithNames | null; error: { message: string } | null };

    setSaving(false);
    if (error || !data) {
      toast.error("Failed to save: " + error?.message);
      return;
    }
    setResults((prev) => [data as ResultWithNames, ...prev]);
    setOpen(false);
    toast.success("Board result posted");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this board result?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("board_results").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    setResults((prev) => prev.filter((r) => r.id !== id));
    toast.success("Deleted");
  };

  const canDelete = (r: ResultWithNames) =>
    profile.role === "officer" || r.posted_by === profile.id;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-[#B8860B]" />
          <h1 className="text-2xl font-bold text-[#003087]">Board Results</h1>
        </div>
        {canPost && (
          <Button onClick={openNew} className="bg-[#003087] hover:bg-[#002266]">
            <Plus className="mr-1 h-4 w-4" /> Post Result
          </Button>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Recommended", key: "recommended", color: "text-green-700" },
          { label: "Not Recommended", key: "not_recommended", color: "text-red-700" },
          { label: "Deferred", key: "deferred", color: "text-amber-600" },
        ].map((s) => (
          <div key={s.key} className="rounded-xl border bg-white p-4 shadow-sm text-center">
            <p className={`text-2xl font-extrabold ${s.color}`}>
              {results.filter((r) => r.result === s.key).length}
            </p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by name or rank…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Results grouped by date */}
      {grouped.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <Trophy className="h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-400">No board results yet.</p>
          {canPost && (
            <Button size="sm" onClick={openNew} className="bg-[#003087] hover:bg-[#002266]">
              Post First Result
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, dateResults]) => (
            <div key={date}>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-gray-400">
                {format(parseISO(date), "EEEE, MMMM d, yyyy")}
              </h2>
              <Card className="divide-y overflow-hidden">
                {dateResults
                  .sort((a, b) =>
                    lastFirst(a.cadet?.full_name ?? "").localeCompare(
                      lastFirst(b.cadet?.full_name ?? "")
                    )
                  )
                  .map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="bg-[#003087] text-xs text-white">
                            {initials(r.cadet?.full_name ?? "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">
                            {lastFirst(r.cadet?.full_name ?? "Unknown")}
                          </p>
                          <p className="text-xs text-gray-500">
                            {[r.from_rank, r.to_rank].filter(Boolean).join(" → ") ||
                              (r.cadet?.rank ?? "—")}
                          </p>
                          {r.notes && (
                            <p className="mt-0.5 text-xs text-gray-400 italic">{r.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge
                          variant="outline"
                          className={RESULT_COLORS[r.result]}
                        >
                          {RESULT_LABELS[r.result]}
                        </Badge>
                        {canDelete(r) && (
                          <button
                            onClick={() => remove(r.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* New Result Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Post Board Result</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Cadet *</Label>
              <Select value={form.cadet_id} onValueChange={(v) => setForm((f) => ({ ...f, cadet_id: v ?? "" }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cadet">
                    {form.cadet_id ? (() => { const c = cadets.find((x) => x.id === form.cadet_id); return c ? `${lastFirst(c.full_name)}${c.rank ? ` (${c.rank})` : ""}` : null; })() : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sortedCadets.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {lastFirst(c.full_name)}{c.rank ? ` (${c.rank})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Board Date *</Label>
              <Input
                type="date"
                value={form.board_date}
                onChange={(e) => setForm((f) => ({ ...f, board_date: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From Rank</Label>
                <Input
                  value={form.from_rank}
                  onChange={(e) => setForm((f) => ({ ...f, from_rank: e.target.value }))}
                  placeholder="e.g. SA"
                />
              </div>
              <div className="space-y-1.5">
                <Label>To Rank</Label>
                <Input
                  value={form.to_rank}
                  onChange={(e) => setForm((f) => ({ ...f, to_rank: e.target.value }))}
                  placeholder="e.g. SN"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Result *</Label>
              <Select
                value={form.result}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, result: v as typeof form.result }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">Recommended</SelectItem>
                  <SelectItem value="not_recommended">Not Recommended</SelectItem>
                  <SelectItem value="deferred">Deferred</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Board comments, conditions, etc."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-[#003087] hover:bg-[#002266]"
            >
              {saving ? "Saving…" : "Post Result"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
