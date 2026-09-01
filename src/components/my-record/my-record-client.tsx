"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  QUAL_TYPES,
  QUAL_STATUS_LABELS,
  QUAL_STATUS_COLORS,
  ATTENDANCE_COLORS,
} from "@/lib/constants";
import { initials, roleLabel, computedTrainingPhase, allBillets } from "@/lib/format";
import { format, formatDistanceToNow } from "date-fns";
import type { Profile, Qualification, Attendance, Correction, Pip, Event } from "@/types/database";
import {
  TrendingUp,
  CheckSquare,
  AlertTriangle,
  Calendar,
  Shield,
} from "lucide-react";

type AttWithEvent = Attendance & { events: { title: string; start_time: string } | null };

interface MyRecordClientProps {
  profile: Profile;
  attendance: AttWithEvent[];
  quals: Qualification[];
  openCorrections: Correction[];
  openPips: Pip[];
  upcomingEvents: Event[];
}

export function MyRecordClient({
  profile,
  attendance,
  quals,
  openCorrections,
  openPips,
  upcomingEvents,
}: MyRecordClientProps) {
  const total = attendance.length;
  const present = attendance.filter((a) => a.status === "present").length;
  const excused = attendance.filter((a) => a.status === "excused").length;
  const absent = attendance.filter((a) => a.status === "absent").length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  const qualMap: Record<string, string> = {};
  for (const q of quals) qualMap[q.qual_type] = q.status;
  const qualsDone = QUAL_TYPES.filter((qt) => qualMap[qt] === "completed").length;
  const qualsInProgress = QUAL_TYPES.filter((qt) => qualMap[qt] === "in_progress").length;

  const nextDrill = upcomingEvents.find((e) => e.event_type === "drill");
  const trainingPhase = computedTrainingPhase(profile.rank ?? null);
  const actionItems = openCorrections.length + openPips.length;

  const attPctColor =
    pct >= 80 ? "text-green-600" : pct >= 60 ? "text-amber-600" : "text-red-600";
  const attBarColor =
    pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Record</h1>
          <p className="text-sm text-gray-500">
            Personal service record &middot; {format(new Date(), "MMMM d, yyyy")}
          </p>
        </div>
        {actionItems > 0 && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-700">
            <AlertTriangle className="h-4 w-4" />
            {actionItems} action item{actionItems !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Profile card */}
      <div className="rounded-xl border bg-[#003087] p-5 text-white shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl font-bold ring-2 ring-white/20">
            {initials(profile.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {profile.rank && (
                <span className="text-sm font-bold text-[#C9A84C]">{profile.rank}</span>
              )}
              <h2 className="text-lg font-bold leading-tight">{profile.full_name}</h2>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {allBillets(profile).map((b) => (
                <span
                  key={b}
                  className="rounded bg-white/10 px-2 py-0.5 text-xs font-medium text-white/80"
                >
                  {b}
                </span>
              ))}
              <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-medium text-white/60">
                {roleLabel(profile.role)}
              </span>
            </div>
            {trainingPhase && (
              <p className="mt-1 text-xs font-medium text-[#C9A84C]/80">{trainingPhase}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            {profile.join_date && (
              <>
                <p className="text-[10px] uppercase tracking-wider text-white/40">Joined</p>
                <p className="text-sm font-semibold text-white/80">
                  {format(new Date(profile.join_date), "MMM yyyy")}
                </p>
              </>
            )}
            {profile.date_of_rank && (
              <>
                <p className="mt-1.5 text-[10px] uppercase tracking-wider text-white/40">
                  Date of rate
                </p>
                <p className="text-sm font-semibold text-white/80">
                  {format(new Date(profile.date_of_rank), "MMM d, yyyy")}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Attendance
            </p>
            <TrendingUp className={`h-4 w-4 ${attPctColor}`} />
          </div>
          <p className={`mt-2 text-3xl font-extrabold ${attPctColor}`}>{pct}%</p>
          <p className="mt-0.5 text-xs text-gray-400">
            {present}/{total} events
          </p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
            <div
              className={`h-1.5 rounded-full ${attBarColor} transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Quals
            </p>
            <CheckSquare className="h-4 w-4 text-[#003087]" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-[#003087]">
            {qualsDone}
            <span className="text-lg text-gray-300">/{QUAL_TYPES.length}</span>
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {qualsInProgress > 0 ? `${qualsInProgress} in progress` : "completed"}
          </p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
            <div
              className="h-1.5 rounded-full bg-[#003087] transition-all"
              style={{ width: `${(qualsDone / QUAL_TYPES.length) * 100}%` }}
            />
          </div>
        </div>

        <div
          className={`rounded-xl border p-4 shadow-sm ${
            actionItems > 0 ? "border-red-200 bg-red-50" : "bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <p
              className={`text-xs font-semibold uppercase tracking-wide ${
                actionItems > 0 ? "text-red-400" : "text-gray-400"
              }`}
            >
              Status
            </p>
            <Shield
              className={`h-4 w-4 ${actionItems > 0 ? "text-red-500" : "text-green-500"}`}
            />
          </div>
          {actionItems > 0 ? (
            <>
              <p className="mt-2 text-3xl font-extrabold text-red-600">{actionItems}</p>
              <p className="mt-0.5 text-xs text-red-400">
                open item{actionItems !== 1 ? "s" : ""}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-2xl font-extrabold text-green-600">Clear</p>
              <p className="mt-0.5 text-xs text-gray-400">no open items</p>
            </>
          )}
        </div>
      </div>

      {/* Next drill */}
      {nextDrill && (
        <Link
          href="/calendar"
          className="flex items-center gap-3 rounded-xl border border-[#003087]/10 bg-[#003087]/5 p-4 transition-colors hover:bg-[#003087]/10"
        >
          <Calendar className="h-5 w-5 shrink-0 text-[#003087]" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-[#003087]/50">
              Next Drill
            </p>
            <p className="font-semibold text-[#003087]">{nextDrill.title}</p>
            <p className="text-sm text-[#003087]/70">
              {format(new Date(nextDrill.start_time), "EEEE, MMMM d")} at{" "}
              {format(new Date(nextDrill.start_time), "h:mm a")}
              {nextDrill.location ? ` · ${nextDrill.location}` : ""}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#003087]/10 px-3 py-1 text-xs font-bold text-[#003087]">
            {formatDistanceToNow(new Date(nextDrill.start_time), { addSuffix: true })}
          </span>
        </Link>
      )}

      {/* Open corrections / PIPs */}
      {actionItems > 0 && (
        <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <p className="text-sm font-bold text-red-800">Action Required</p>
          </div>
          {openCorrections.map((c) => (
            <div
              key={c.id}
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-white p-3"
            >
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-700">
                Tier {c.tier}
              </span>
              <p className="flex-1 text-sm text-gray-700">{c.description}</p>
            </div>
          ))}
          {openPips.map((p) => (
            <div
              key={p.id}
              className="flex items-start gap-2 rounded-lg border border-orange-200 bg-white p-3"
            >
              <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-bold text-orange-700">
                PIP
              </span>
              <p className="flex-1 text-sm text-gray-700">{p.root_cause}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quals + Attendance grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Qualifications */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold text-gray-800">Qualifications</h2>
            <span className="text-xs text-gray-400">
              {qualsDone}/{QUAL_TYPES.length} complete
            </span>
          </div>
          <div className="divide-y">
            {QUAL_TYPES.map((qt) => {
              const status = (qualMap[qt] ?? "not_started") as
                | "not_started"
                | "in_progress"
                | "completed";
              return (
                <div key={qt} className="flex items-center justify-between px-4 py-2.5">
                  <p className="text-sm text-gray-700">{qt}</p>
                  <Badge variant="outline" className={QUAL_STATUS_COLORS[status]}>
                    {status === "completed" && "✓ "}
                    {QUAL_STATUS_LABELS[status]}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attendance history */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold text-gray-800">Attendance History</h2>
            <div className="flex items-center gap-3 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />P: {present}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />E: {excused}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-red-400" />A: {absent}
              </span>
            </div>
          </div>
          <div className="max-h-[340px] divide-y overflow-y-auto">
            {attendance.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">
                No attendance records yet.
              </p>
            ) : (
              attendance.slice(0, 30).map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {a.events?.title ?? "Event"}
                    </p>
                    {a.events?.start_time && (
                      <p className="text-xs text-gray-400">
                        {format(new Date(a.events.start_time), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className={ATTENDANCE_COLORS[a.status]}>
                    {a.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
