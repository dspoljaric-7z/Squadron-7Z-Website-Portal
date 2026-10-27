"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { History, Search } from "lucide-react";
import type { Profile } from "@/types/database";

type AuditEntry = {
  id: number;
  actor_id: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  table_name: string;
  row_id: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string; rank: string | null; role: string } | null;
};

const ACTION_COLORS: Record<string, string> = {
  INSERT: "bg-green-100 text-green-800 border-green-200",
  UPDATE: "bg-blue-100 text-blue-800 border-blue-200",
  DELETE: "bg-red-100 text-red-800 border-red-200",
};

const TABLE_LABELS: Record<string, string> = {
  pips: "PIP",
  corrections: "Correction",
  billet_nominations: "Nomination",
};

export function AuditLogClient({ initialEntries }: { initialEntries: AuditEntry[]; profile: Profile }) {
  const [search, setSearch] = useState("");
  const [tableFilter, setTableFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  const tables = useMemo(() => {
    const s = new Set(initialEntries.map((e) => e.table_name));
    return Array.from(s).sort();
  }, [initialEntries]);

  const filtered = useMemo(() => {
    return initialEntries.filter((e) => {
      if (tableFilter !== "all" && e.table_name !== tableFilter) return false;
      if (actionFilter !== "all" && e.action !== actionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const actorName = e.actor?.full_name?.toLowerCase() ?? "";
        if (!actorName.includes(q) && !e.table_name.includes(q) && !e.row_id.includes(q)) return false;
      }
      return true;
    });
  }, [initialEntries, tableFilter, actionFilter, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#003087] flex items-center gap-2">
          <History className="h-6 w-6" /> Audit Log
        </h1>
        <p className="text-sm text-gray-500">All changes to PIPs, nominations, and corrections</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Search by actor or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={tableFilter} onValueChange={(v) => setTableFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="All tables" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tables</SelectItem>
            {tables.map((t) => <SelectItem key={t} value={t}>{TABLE_LABELS[t] ?? t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={(v) => setActionFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="INSERT">Insert</SelectItem>
            <SelectItem value="UPDATE">Update</SelectItem>
            <SelectItem value="DELETE">Delete</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-gray-400">{filtered.length} entries</p>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-400">
          No audit entries found.
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((entry) => (
            <Card
              key={entry.id}
              className="cursor-pointer hover:border-[#003087]/30 transition-colors"
              onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
            >
              <div className="flex items-center gap-3 p-3">
                <Badge className={ACTION_COLORS[entry.action] ?? "bg-gray-100 text-gray-600"} variant="outline">
                  {entry.action}
                </Badge>
                <span className="text-sm font-medium text-gray-700">{TABLE_LABELS[entry.table_name] ?? entry.table_name}</span>
                <span className="text-xs text-gray-400 font-mono truncate flex-1">{entry.row_id}</span>
                <span className="text-xs text-gray-500 shrink-0">
                  {entry.actor ? `${entry.actor.rank ? entry.actor.rank + " " : ""}${entry.actor.full_name}` : "System"}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {format(new Date(entry.created_at), "MMM d, HH:mm")}
                </span>
              </div>
              {expanded === entry.id && (
                <div className="border-t bg-gray-50 p-3 space-y-2">
                  {entry.before_data && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Before</p>
                      <pre className="text-[11px] text-gray-600 overflow-x-auto rounded bg-white border p-2 max-h-48">
                        {JSON.stringify(entry.before_data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {entry.after_data && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">After</p>
                      <pre className="text-[11px] text-gray-600 overflow-x-auto rounded bg-white border p-2 max-h-48">
                        {JSON.stringify(entry.after_data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
