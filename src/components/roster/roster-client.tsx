"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Users, ExternalLink, AlertCircle } from "lucide-react";
import { HintButton } from "@/components/shared/hint-button";

const ROSTER_HINTS = [
  { heading: "Viewing a cadet's record", body: "Click any cadet's name or row to open their full profile — rank, billets, qualifications, drill attendance history, and documents." },
  { heading: "Filtering by role", body: "Use the role chips (Officer, SNCO, NCO, Cadet) to narrow the list. Click multiple to show more than one group at once." },
  { heading: "Search", body: "The search bar filters by name in real time. Useful for finding a specific cadet quickly." },
  { heading: "Inactive cadets", body: "The roster shows active cadets by default. Inactive/deactivated accounts are managed by officers in the Admin → Members tab." },
];
import { format } from "date-fns";
import { initials, roleLabel, computedTrainingPhase, allBillets, ROLE_ORDER } from "@/lib/format";
import { isStaff } from "@/lib/permissions";
import { DRILL_ATTENDANCE_COLORS, QUAL_STATUS_LABELS, QUAL_STATUS_COLORS } from "@/lib/constants";
import type { Profile, DrillAttendance, Qualification, QualStatus, DrillAttendanceStatus } from "@/types/database";

type RosterProfile = {
  id: string;
  full_name: string;
  rank: string | null;
  role: string;
  billet: string | null;
  billet_2: string | null;
  billet_3: string | null;
  join_date?: string | null;
  date_of_rank?: string | null;
  division_id: string | null;
  email?: string | null;
  active: boolean;
  approved: boolean;
  is_command: boolean | null;
  is_maa: boolean | null;
};

type DetailData = {
  drillAttendance: (DrillAttendance & { drill_sessions: { date: string; location: string | null } | null })[];
  qualifications: Qualification[];
};

const ROLE_BADGE: Record<string, string> = {
  officer: "bg-[#B8860B]/10 text-[#B8860B] border-[#B8860B]/30",
  snco: "bg-purple-100 text-purple-700 border-purple-200",
  nco: "bg-amber-100 text-amber-800 border-amber-200",
  cadet: "bg-blue-100 text-blue-700 border-blue-200",
};

export function RosterClient({ cadets, profile, qualTypes }: { cadets: RosterProfile[]; profile: Profile; qualTypes: string[] }) {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [selected, setSelected] = useState<RosterProfile | null>(null);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const pendingDetailId = useRef<string | null>(null);
  const [detailTab, setDetailTab] = useState<"attendance" | "quals">("attendance");

  const staffUser = isStaff(profile);

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
        const ro = (ROLE_ORDER[a.role as keyof typeof ROLE_ORDER] ?? 99) - (ROLE_ORDER[b.role as keyof typeof ROLE_ORDER] ?? 99);
        if (ro !== 0) return ro;
        return a.full_name.localeCompare(b.full_name);
      });
  }, [cadets, search, filterRole]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of cadets) map[c.role] = (map[c.role] ?? 0) + 1;
    return map;
  }, [cadets]);

  const openDetail = async (cadet: RosterProfile) => {
    setSelected(cadet);
    setDetail(null);
    setLoadingDetail(true);
    setSheetOpen(true);
    pendingDetailId.current = cadet.id;
    const supabase = createClient();
    const [attRes, qualRes] = await Promise.all([
      supabase
        .from("drill_attendance")
        .select("*, drill_sessions(date, location)")
        .eq("cadet_id", cadet.id)
        .order("recorded_at", { ascending: false })
        .limit(20),
      supabase.from("qualifications").select("*").eq("cadet_id", cadet.id),
    ]);
    if (pendingDetailId.current !== cadet.id) return;
    setDetail({
      drillAttendance: (attRes.data ?? []) as never,
      qualifications: qualRes.data ?? [],
    });
    setLoadingDetail(false);
  };

  const phase = selected ? computedTrainingPhase(selected.rank) : null;
  const billets = selected ? allBillets(selected as never) : [];
  const presentCount = detail ? detail.drillAttendance.filter((a) => a.status === "present" || a.status === "late").length : 0;
  const totalDrills = detail?.drillAttendance.length ?? 0;
  const attPct = totalDrills > 0 ? Math.round((presentCount / totalDrills) * 100) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#003087]" />
          <h1 className="text-xl font-bold text-gray-900">Roster</h1>
          <HintButton title="Roster" hints={ROSTER_HINTS} />
        </div>
        <span className="text-sm text-gray-500">{cadets.length} members</span>
      </div>

      {/* Role filter */}
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
          const cPhase = computedTrainingPhase(c.rank ?? null);
          const cBillets = [c.billet, c.billet_2, c.billet_3].filter(Boolean);
          const missingCount = [!c.rank, !c.join_date, !c.division_id].filter(Boolean).length;
          const rowContent = (
            <>
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
                  {cBillets.length > 0 && <span>{cBillets.join(" · ")}</span>}
                  {cPhase && <span className="text-[#003087]/60">{cPhase}</span>}
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <Badge variant="outline" className={`text-[10px] capitalize ${ROLE_BADGE[c.role] ?? ""}`}>
                  {roleLabel(c.role)}
                </Badge>
                {c.join_date && (
                  <span className="text-[10px] text-gray-300">{format(new Date(c.join_date), "MMM yyyy")}</span>
                )}
                {staffUser && missingCount > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-600">
                    <AlertCircle className="h-3 w-3" />{missingCount} missing
                  </span>
                )}
              </div>
            </>
          );

          if (staffUser) {
            return (
              <button
                key={c.id}
                onClick={() => openDetail(c)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-gray-50"
              >
                {rowContent}
              </button>
            );
          }

          return (
            <Link
              key={c.id}
              href={`/cadets/${c.id}`}
              className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50"
            >
              {rowContent}
            </Link>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-400">
        Showing {filtered.length} of {cadets.length} members
      </p>

      {/* Detail sheet (staff only) */}
      {staffUser && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="overflow-y-auto sm:max-w-md">
            {selected && (
              <>
                <SheetHeader className="pb-4">
                  <SheetTitle>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarFallback className="bg-[#003087] text-white">{initials(selected.full_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-base font-bold text-gray-900">
                          {selected.rank ? `${selected.rank} ` : ""}{selected.full_name}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          <Badge variant="outline" className={`text-[10px] ${ROLE_BADGE[selected.role] ?? ""}`}>{roleLabel(selected.role)}</Badge>
                          {phase && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">{phase}</Badge>}
                        </div>
                      </div>
                    </div>
                  </SheetTitle>
                </SheetHeader>

                {billets.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {billets.map((b) => <Badge key={b} variant="outline" className="text-xs">{b}</Badge>)}
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-3">
                  {selected.join_date && <span>Joined {format(new Date(selected.join_date), "MMM d, yyyy")}</span>}
                  {selected.date_of_rank && <span>Date of Rank {format(new Date(selected.date_of_rank), "MMM d, yyyy")}</span>}
                  {selected.email && <span className="text-gray-400">{selected.email}</span>}
                </div>

                {attPct !== null && (
                  <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 mb-4">
                    <span className="text-2xl font-bold text-[#003087]">{attPct}%</span>
                    <span className="text-sm text-gray-500">attendance ({presentCount}/{totalDrills} drills)</span>
                  </div>
                )}

                {loadingDetail && (
                  <div className="text-center py-8 text-sm text-gray-400">Loading records…</div>
                )}

                <Link
                  href={`/cadets/${selected.id}`}
                  className="mb-4 flex items-center justify-center gap-1.5 rounded-lg border border-[#003087]/20 bg-[#003087]/5 px-3 py-2 text-sm font-medium text-[#003087] transition-colors hover:bg-[#003087]/10"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> View Full Profile
                </Link>

                {detail && (
                  <>
                    <div className="border-b border-gray-200 mb-3">
                      <nav className="-mb-px flex">
                        {([
                          { value: "attendance", label: `Drill (${detail.drillAttendance.length})` },
                          { value: "quals",      label: "Quals" },
                        ] as const).map(({ value, label }) => (
                          <button
                            key={value}
                            onClick={() => setDetailTab(value)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                              detailTab === value
                                ? "border-[#003087] text-[#003087]"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </nav>
                    </div>

                    {detailTab === "attendance" && <div className="space-y-1">
                      {detail.drillAttendance.length === 0 && (
                        <p className="text-center py-6 text-sm text-gray-400">No drill records.</p>
                      )}
                      {detail.drillAttendance.map((a) => (
                        <div key={a.id} className="flex items-center justify-between rounded border bg-white px-3 py-2 text-sm">
                          <span className="text-gray-700">
                            {a.drill_sessions
                              ? format(new Date(a.drill_sessions.date + "T12:00:00"), "MMM d, yyyy")
                              : "Unknown date"}
                            {a.drill_sessions?.location ? ` · ${a.drill_sessions.location}` : ""}
                          </span>
                          <Badge className={DRILL_ATTENDANCE_COLORS[a.status as DrillAttendanceStatus]} variant="outline">
                            {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                          </Badge>
                        </div>
                      ))}
                    </div>}

                    {detailTab === "quals" && <div className="grid gap-2 sm:grid-cols-2">
                      {qualTypes.map((qt) => {
                        const q = detail.qualifications.find((x) => x.qual_type === qt);
                        const status: QualStatus = q?.status ?? "not_started";
                        return (
                          <div key={qt} className="flex items-center justify-between rounded border bg-white px-3 py-2 text-sm">
                            <span className="text-gray-700">{qt}</span>
                            <Badge className={QUAL_STATUS_COLORS[status]} variant="outline">
                              {QUAL_STATUS_LABELS[status]}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>}
                  </>
                )}
              </>
            )}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
