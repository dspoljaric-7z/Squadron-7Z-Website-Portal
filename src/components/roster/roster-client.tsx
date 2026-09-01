"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users } from "lucide-react";
import { format } from "date-fns";
import { initials, roleLabel, computedTrainingPhase, ROLE_ORDER } from "@/lib/format";
import type { Profile } from "@/types/database";

type RosterProfile = Pick<
  Profile,
  "id" | "full_name" | "rank" | "role" | "billet" | "billet_2" | "billet_3" | "join_date" | "is_command" | "is_maa"
>;

const ROLE_BADGE: Record<string, string> = {
  officer: "bg-[#B8860B]/10 text-[#B8860B] border-[#B8860B]/30",
  snco: "bg-purple-100 text-purple-700 border-purple-200",
  nco: "bg-amber-100 text-amber-800 border-amber-200",
  cadet: "bg-blue-100 text-blue-700 border-blue-200",
};

export function RosterClient({ cadets }: { cadets: RosterProfile[] }) {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cadets
      .filter((c) => {
        const matchesSearch =
          !q ||
          c.full_name.toLowerCase().includes(q) ||
          (c.rank ?? "").toLowerCase().includes(q) ||
          (c.billet ?? "").toLowerCase().includes(q);
        const matchesRole = filterRole === "all" || c.role === filterRole;
        return matchesSearch && matchesRole;
      })
      .sort((a, b) => {
        const ro = (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99);
        if (ro !== 0) return ro;
        return a.full_name.localeCompare(b.full_name);
      });
  }, [cadets, search, filterRole]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of cadets) map[c.role] = (map[c.role] ?? 0) + 1;
    return map;
  }, [cadets]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#003087]" />
          <h1 className="text-xl font-bold text-gray-900">Roster</h1>
        </div>
        <span className="text-sm text-gray-500">{cadets.length} members</span>
      </div>

      {/* Role summary */}
      <div className="flex flex-wrap gap-2">
        {(["officer", "snco", "nco", "cadet"] as const).map((role) =>
          (counts[role] ?? 0) > 0 ? (
            <button
              key={role}
              onClick={() => setFilterRole(filterRole === role ? "all" : role)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                filterRole === role
                  ? "bg-[#003087] text-white border-[#003087]"
                  : (ROLE_BADGE[role] ?? "bg-gray-100 text-gray-600 border-gray-200")
              }`}
            >
              {roleLabel(role)} ({counts[role]})
            </button>
          ) : null
        )}
        {filterRole !== "all" && (
          <button
            onClick={() => setFilterRole("all")}
            className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50"
          >
            Clear filter ×
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, rank, or billet…"
          className="pl-9"
        />
      </div>

      {/* Roster list */}
      <div className="divide-y rounded-xl border bg-white shadow-sm overflow-hidden">
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">No members found.</p>
        )}
        {filtered.map((c) => {
          const phase = computedTrainingPhase(c.rank ?? null);
          const billets = [c.billet, c.billet_2, c.billet_3].filter(Boolean);
          return (
            <Link
              key={c.id}
              href={`/cadets/${c.id}`}
              className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#003087] text-sm font-bold text-white">
                {initials(c.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 truncate">
                    {c.rank ? `${c.rank} ` : ""}{c.full_name}
                  </span>
                  {c.is_command && (
                    <Badge className="bg-[#B8860B]/10 text-[#B8860B] border-[#B8860B]/30 text-[10px] px-1.5 py-0">
                      CMD
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
                  {billets.length > 0 && <span>{billets.join(" · ")}</span>}
                  {phase && <span className="text-[#003087]/60">{phase}</span>}
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <Badge
                  variant="outline"
                  className={`text-[10px] capitalize ${ROLE_BADGE[c.role] ?? ""}`}
                >
                  {roleLabel(c.role)}
                </Badge>
                {c.join_date && (
                  <span className="text-[10px] text-gray-300">
                    {format(new Date(c.join_date), "MMM yyyy")}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-400">
        Showing {filtered.length} of {cadets.length} members
      </p>
    </div>
  );
}
