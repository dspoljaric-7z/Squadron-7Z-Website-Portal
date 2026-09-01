"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Search, ChevronRight } from "lucide-react";
import { initials, lastFirst, byLastName, roleLabel, computedTrainingPhase, allBillets } from "@/lib/format";
import { DRILL_ATTENDANCE_COLORS, QUAL_STATUS_LABELS, QUAL_STATUS_COLORS, QUAL_TYPES } from "@/lib/constants";
import type { Profile, DrillAttendance, Qualification, QualStatus, DrillAttendanceStatus } from "@/types/database";

type CadetRow = Pick<Profile, "id" | "full_name" | "rank" | "billet" | "billet_2" | "billet_3" | "role" | "division_id" | "join_date" | "date_of_rank" | "active" | "approved" | "email">;

type DetailData = {
  drillAttendance: (DrillAttendance & { drill_sessions: { date: string; location: string | null } | null })[];
  qualifications: Qualification[];
};

export function CadetLookupClient({ cadets }: { cadets: CadetRow[]; profile: Profile }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CadetRow | null>(null);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const filtered = useMemo(() => {
    const sorted = [...cadets].sort(byLastName);
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter(
      (c) => c.full_name.toLowerCase().includes(q) || (c.rank ?? "").toLowerCase().includes(q) || (c.billet ?? "").toLowerCase().includes(q)
    );
  }, [cadets, query]);

  const selectCadet = async (cadet: CadetRow) => {
    setSelected(cadet);
    setDetail(null);
    setLoadingDetail(true);
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
    setDetail({
      drillAttendance: (attRes.data ?? []) as never,
      qualifications: qualRes.data ?? [],
    });
    setLoadingDetail(false);
  };

  const phase = selected ? computedTrainingPhase(selected.rank) : null;
  const billets = selected ? allBillets(selected) : [];

  const presentCount = detail ? detail.drillAttendance.filter((a) => a.status === "present" || a.status === "late").length : 0;
  const totalDrills = detail?.drillAttendance.length ?? 0;
  const attPct = totalDrills > 0 ? Math.round((presentCount / totalDrills) * 100) : null;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 overflow-hidden">
      {/* Left panel: search + list */}
      <div className={`flex flex-col ${selected ? "hidden sm:flex" : "flex"} w-full sm:w-72 shrink-0`}>
        <h1 className="mb-3 text-xl font-bold text-gray-900">Cadet Lookup</h1>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name, rank, billet…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCadet(c)}
              className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-gray-50 ${selected?.id === c.id ? "border-[#003087] bg-blue-50" : "bg-white"}`}
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-[#003087] text-xs text-white">{initials(c.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{c.rank ? `${c.rank} ` : ""}{lastFirst(c.full_name)}</p>
                  {c.billet && <p className="truncate text-xs text-gray-500">{c.billet}</p>}
                </div>
                <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-gray-400" />
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">No cadets found.</p>
          )}
        </div>
      </div>

      {/* Right panel: detail */}
      <div className={`${selected ? "flex" : "hidden sm:flex"} flex-1 flex-col overflow-y-auto`}>
        {!selected && (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center text-gray-400">
              <Search className="mx-auto mb-2 h-10 w-10" />
              <p>Select a cadet to view their full record</p>
            </div>
          </div>
        )}

        {selected && (
          <div className="space-y-4">
            <button onClick={() => setSelected(null)} className="text-sm text-gray-500 hover:text-gray-700 sm:hidden">
              ← Back to list
            </button>

            {/* Header card */}
            <Card className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14 shrink-0">
                  <AvatarFallback className="bg-[#003087] text-lg text-white">{initials(selected.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-gray-900">
                    {selected.rank ? `${selected.rank} ` : ""}{selected.full_name}
                  </h2>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs">{roleLabel(selected.role)}</Badge>
                    {!selected.active && <Badge className="bg-red-100 text-red-700 text-xs">Inactive</Badge>}
                    {phase && <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">{phase}</Badge>}
                  </div>
                  {billets.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {billets.map((b) => <Badge key={b} variant="outline" className="text-xs">{b}</Badge>)}
                    </div>
                  )}
                  <div className="mt-2 flex gap-4 text-xs text-gray-500">
                    {selected.join_date && <span>Joined {format(new Date(selected.join_date), "MMM d, yyyy")}</span>}
                    {selected.date_of_rank && <span>Date of Rank {format(new Date(selected.date_of_rank), "MMM d, yyyy")}</span>}
                  </div>
                  {selected.email && <p className="mt-1 text-xs text-gray-400">{selected.email}</p>}
                </div>
              </div>
              {attPct !== null && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                  <span className="text-2xl font-bold text-[#003087]">{attPct}%</span>
                  <span className="text-sm text-gray-500">attendance ({presentCount}/{totalDrills} drills)</span>
                </div>
              )}
            </Card>

            {loadingDetail && (
              <div className="text-center py-8 text-sm text-gray-400">Loading records…</div>
            )}

            {detail && (
              <Tabs defaultValue="attendance">
                <TabsList>
                  <TabsTrigger value="attendance">Drill Attendance ({detail.drillAttendance.length})</TabsTrigger>
                  <TabsTrigger value="quals">Qualifications</TabsTrigger>
                </TabsList>

                <TabsContent value="attendance" className="mt-3 space-y-1">
                  {detail.drillAttendance.length === 0 && (
                    <p className="text-center py-6 text-sm text-gray-400">No drill attendance records.</p>
                  )}
                  {detail.drillAttendance.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded border bg-white px-3 py-2 text-sm">
                      <span className="text-gray-700">
                        {a.drill_sessions ? format(new Date(a.drill_sessions.date + "T12:00:00"), "MMM d, yyyy") : "Unknown date"}
                        {a.drill_sessions?.location ? ` · ${a.drill_sessions.location}` : ""}
                      </span>
                      <Badge className={DRILL_ATTENDANCE_COLORS[a.status as DrillAttendanceStatus]} variant="outline">
                        {a.status}
                      </Badge>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="quals" className="mt-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {QUAL_TYPES.map((qt) => {
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
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
