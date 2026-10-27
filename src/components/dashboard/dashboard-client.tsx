"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { Badge } from "@/components/ui/badge";
import { roleLabel } from "@/lib/format";
import type { Announcement, Attendance, Event, PlanOfDay, Profile, SavedLink } from "@/types/database";
import {
  CalendarDays,
  Megaphone,
  UserCheck,
  Anchor,
  Users,
  ClipboardList,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Bell,
  Clock,
  MapPin,
  Plus,
  ClipboardCheck,
  TrendingUp,
  CheckSquare,
  Shield,
  BookOpen,
  FileWarning,
  Activity,
  BarChart2,
  FileText,
  Shirt,
  Award,
  Link2,
  ExternalLink,
  CalendarOff,
  Ship,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isTomorrow, differenceInDays } from "date-fns";

type AnnouncementWithAuthor = Announcement & {
  profiles: { full_name: string; rank: string | null } | null;
};

type AttendanceWithEvent = Attendance & {
  events: { title: string; start_time: string } | null;
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  drill: "bg-[#003087]/10 text-[#003087] border-[#003087]/20",
  training: "bg-blue-50 text-blue-700 border-blue-200",
  ceremony: "bg-[#B8860B]/10 text-[#B8860B] border-[#B8860B]/20",
  community_service: "bg-green-50 text-green-700 border-green-200",
  other: "bg-gray-100 text-gray-600 border-gray-200",
};

function eventDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE, MMM d");
}

export function DashboardClient({
  profile,
  initialEvents,
  initialAnnouncements,
  initialPendingCount,
  pendingAbsenceCount,
  memberCount,
  todayPod,
  linkedCadet = null,
  cadetAttendance = null,
  openCorrectionsCount,
  activePipelinesCount,
  openPipsCount,
  myAttendancePct = 0,
  myAttendanceTotal = 0,
  myQualsDone = 0,
  myOpenCorrections = 0,
  totalQuals = 7,
  missingDocsCount = 0,
  unitAttendanceLast3,
  overdueDocsCount,
  divisionMemberCount,
  divisionAttendancePct,
  expiringPaperworkCount,
  lcpoOpenPipsCount,
  lastInspectionDate,
  vacantBilletsCount,
  staleAbsenceCount,
  submittedPodCount,
  isNewStaff = false,
  nextDrillSession,
  nextTswSession,
  savedLinks = [],
  recentAbsenceDecisions = [],
}: {
  profile: Profile;
  initialEvents: Event[];
  initialAnnouncements: AnnouncementWithAuthor[];
  initialPendingCount: number;
  pendingAbsenceCount?: number;
  memberCount: number;
  todayPod: PlanOfDay | null;
  linkedCadet?: Profile | null;
  cadetAttendance?: AttendanceWithEvent[] | null;
  openCorrectionsCount?: number;
  activePipelinesCount?: number;
  openPipsCount?: number;
  myAttendancePct?: number;
  myAttendanceTotal?: number;
  myQualsDone?: number;
  myOpenCorrections?: number;
  totalQuals?: number;
  missingDocsCount?: number;
  unitAttendanceLast3?: number;
  overdueDocsCount?: number;
  divisionMemberCount?: number;
  divisionAttendancePct?: number;
  expiringPaperworkCount?: number;
  lcpoOpenPipsCount?: number;
  lastInspectionDate?: string | null;
  vacantBilletsCount?: number;
  staleAbsenceCount?: number;
  submittedPodCount?: number;
  isNewStaff?: boolean;
  nextDrillSession?: { id: string; date: string; location: string | null; uniform_of_day: string | null; notes: string | null; theme?: string | null } | null;
  nextTswSession?: { date: string; theme: string | null } | null;
  savedLinks?: SavedLink[];
  recentAbsenceDecisions?: { id: string; requested_date: string; request_type: string | null; status: string; review_notes: string | null; created_at: string }[];
}) {
  const [events, setEvents] = useState(initialEvents);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [pendingCount, setPendingCount] = useState(initialPendingCount);

  const isStaff = profile.role === "officer" || profile.role === "snco" || profile.role === "nco";

  function drillCountdown(dateStr: string): string {
    const drillDate = new Date(dateStr + "T00:00:00");
    const now = new Date();
    const days = differenceInDays(drillDate, now);
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days < 0) return "Past";
    return `${days} days`;
  }

  function timeInRate(dateOfRank: string | null): string {
    if (!dateOfRank) return "—";
    const days = differenceInDays(new Date(), new Date(dateOfRank));
    const months = Math.floor(days / 30);
    if (months < 1) return `${days}d`;
    if (months < 12) return `${months}mo`;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    return remMonths > 0 ? `${years}y ${remMonths}mo` : `${years}y`;
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        supabase
          .from("events")
          .select("*")
          .gte("start_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(6)
          .then(({ data }) => data && setEvents(data));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
        supabase
          .from("announcements")
          .select("*, profiles:posted_by(full_name, rank)")
          .order("created_at", { ascending: false })
          .limit(6)
          .then(({ data }) => data && setAnnouncements(data as unknown as AnnouncementWithAuthor[]));
      });

    if (isStaff) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("approved", false)
          .then(({ count }) => setPendingCount(count ?? 0));
      });
    }

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isStaff]);

  const urgent = announcements.filter((a) => a.priority === "urgent");
  const firstName = profile.full_name.split(" ")[0];

  // Parent-specific view
  if (profile.role === "parent") {
    const att = cadetAttendance ?? [];
    const total = att.length;
    const present = att.filter((a) => a.status === "present").length;
    const pct = total > 0 ? Math.round((present / total) * 100) : null;

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-[#003087] sm:text-3xl">Family Portal</h1>
            <p className="mt-0.5 text-sm text-gray-500">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
          </div>
          <LiveIndicator />
        </div>

        {linkedCadet ? (
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Your Cadet</p>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#003087] text-lg font-bold text-white">
                {linkedCadet.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-gray-900">{linkedCadet.full_name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {linkedCadet.rank && <span className="text-sm font-bold text-[#B8860B]">{linkedCadet.rank}</span>}
                  {linkedCadet.billet && <span className="text-sm text-gray-500">{linkedCadet.billet}</span>}
                </div>
                {linkedCadet.join_date && (
                  <p className="text-xs text-gray-400 mt-0.5">Joined {format(new Date(linkedCadet.join_date), "MMMM yyyy")}</p>
                )}
              </div>
              {pct !== null && (
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 justify-end">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-3xl font-extrabold text-[#003087]">{pct}%</span>
                  </div>
                  <p className="text-xs text-gray-400">attendance</p>
                  <p className="text-xs text-gray-300">{present}/{total} events</p>
                </div>
              )}
            </div>

            {att.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Recent Attendance</p>
                <div className="space-y-1">
                  {att.slice(0, 5).map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 truncate">{a.events?.title ?? "Event"}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {a.events && <span className="text-xs text-gray-400">{format(new Date(a.events.start_time), "MMM d")}</span>}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          a.status === "present" ? "bg-green-100 text-green-700" :
                          a.status === "excused" ? "bg-blue-100 text-blue-700" :
                          "bg-red-100 text-red-700"
                        }`}>{a.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-white p-8 text-center">
            <p className="text-sm text-gray-400">No cadet linked to your account yet.</p>
            <p className="mt-1 text-xs text-gray-300">Contact a Squadron Officer to link your cadet.</p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Upcoming Events */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold text-gray-800">Upcoming Events</h2>
              <a href="/calendar" className="text-xs font-medium text-[#003087] hover:underline">View all →</a>
            </div>
            <div className="divide-y">
              {events.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-400">No upcoming events.</p>}
              {events.slice(0, 4).map((evt) => (
                <div key={evt.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="mt-0.5 flex w-12 shrink-0 flex-col items-center rounded-lg border border-[#003087]/10 bg-[#003087]/5 py-1.5 text-center">
                    <span className="text-[10px] font-bold uppercase text-[#003087]/50">{format(new Date(evt.start_time), "MMM")}</span>
                    <span className="text-lg font-extrabold leading-none text-[#003087]">{format(new Date(evt.start_time), "d")}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-gray-800">{evt.title}</p>
                    <p className="mt-0.5 text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {eventDateLabel(evt.start_time)}, {format(new Date(evt.start_time), "HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold text-gray-800">Announcements</h2>
              <a href="/announcements" className="text-xs font-medium text-[#003087] hover:underline">View all →</a>
            </div>
            <div className="divide-y">
              {announcements.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-400">No announcements.</p>}
              {announcements.slice(0, 4).map((a) => (
                <div key={a.id} className={`border-l-4 px-4 py-3 ${
                  a.priority === "urgent" ? "border-l-red-500 bg-red-50/40" :
                  a.priority === "important" ? "border-l-amber-400 bg-amber-50/30" :
                  "border-l-transparent"
                }`}>
                  <p className="font-semibold text-gray-800 text-sm">{a.title}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#003087] sm:text-3xl">
            Welcome back,{" "}
            <span className="text-[#B8860B]">
              {profile.rank ? `${profile.rank} ${firstName}` : firstName}
            </span>
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {roleLabel(profile.role)} &middot;{" "}
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <LiveIndicator />
      </div>

      {/* Officer / SNCO: Unit Health Strip */}
      {(profile.role === "officer" || profile.role === "snco") && unitAttendanceLast3 !== undefined && (
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/drill"
            className="rounded-xl border bg-[#003087] p-4 text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Attendance (3 Drills)</p>
              <Activity className="h-4 w-4 text-white/30" />
            </div>
            <p className="mt-2 text-3xl font-extrabold">{unitAttendanceLast3}%</p>
            <p className="mt-0.5 text-xs text-white/40">unit rate</p>
          </Link>
          <Link
            href="/docs"
            className={`rounded-xl border p-4 shadow-sm transition-colors hover:border-opacity-50 ${
              (overdueDocsCount ?? 0) > 0 ? "border-amber-200 bg-amber-50" : "bg-white hover:border-green-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-xs font-semibold uppercase tracking-wide ${(overdueDocsCount ?? 0) > 0 ? "text-amber-500" : "text-gray-400"}`}>
                Expired Docs
              </p>
              <FileWarning className={`h-4 w-4 ${(overdueDocsCount ?? 0) > 0 ? "text-amber-500" : "text-gray-300"}`} />
            </div>
            <p className={`mt-2 text-3xl font-extrabold ${(overdueDocsCount ?? 0) > 0 ? "text-amber-600" : "text-gray-400"}`}>
              {overdueDocsCount ?? 0}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">expired</p>
          </Link>
          <Link
            href="/report"
            className="rounded-xl border bg-white p-4 shadow-sm transition-colors hover:border-[#003087]/30"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Unit Report</p>
              <BarChart2 className="h-4 w-4 text-[#003087]" />
            </div>
            <p className="mt-2 text-sm font-bold text-[#003087]">View</p>
            <p className="mt-0.5 text-xs text-gray-400">printable summary</p>
          </Link>
        </div>
      )}

      {/* LCPO: Unit Health Aggregate */}
      {profile.is_lcpo && expiringPaperworkCount !== undefined && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border bg-[#003087] p-4 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Expiring (30d)</p>
              <FileText className="h-4 w-4 text-white/30" />
            </div>
            <p className="mt-2 text-3xl font-extrabold">{expiringPaperworkCount}</p>
            <p className="mt-0.5 text-xs text-white/40">paperwork docs</p>
          </div>
          <div className={`rounded-xl border p-4 shadow-sm ${lcpoOpenPipsCount ? "bg-red-50" : "bg-white"}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Open PIPs</p>
              <AlertCircle className={`h-4 w-4 ${lcpoOpenPipsCount ? "text-red-500" : "text-gray-300"}`} />
            </div>
            <p className={`mt-2 text-3xl font-extrabold ${lcpoOpenPipsCount ? "text-red-600" : "text-[#003087]"}`}>{lcpoOpenPipsCount ?? 0}</p>
            <p className="mt-0.5 text-xs text-gray-400">active plans</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Last Inspection</p>
              <Shirt className="h-4 w-4 text-[#003087]" />
            </div>
            <p className="mt-2 text-sm font-bold text-[#003087]">{lastInspectionDate ?? "None"}</p>
            <p className="mt-0.5 text-xs text-gray-400">most recent drill</p>
          </div>
          <div className={`rounded-xl border p-4 shadow-sm ${vacantBilletsCount ? "bg-amber-50" : "bg-white"}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Vacant Billets</p>
              <Award className={`h-4 w-4 ${vacantBilletsCount ? "text-amber-500" : "text-gray-300"}`} />
            </div>
            <p className={`mt-2 text-3xl font-extrabold ${vacantBilletsCount ? "text-amber-600" : "text-[#003087]"}`}>{vacantBilletsCount ?? 0}</p>
            <p className="mt-0.5 text-xs text-gray-400">need assignment</p>
          </div>
        </div>
      )}

      {/* NCO: Division Stats */}
      {profile.role === "nco" && divisionMemberCount !== undefined && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-[#003087] p-4 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Division Strength</p>
              <Users className="h-4 w-4 text-white/30" />
            </div>
            <p className="mt-2 text-3xl font-extrabold">{divisionMemberCount}</p>
            <p className="mt-0.5 text-xs text-white/40">active cadets</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Division Att.</p>
              <Activity className="h-4 w-4 text-[#003087]" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-[#003087]">{divisionAttendancePct ?? 0}%</p>
            <p className="mt-0.5 text-xs text-gray-400">all-time rate</p>
          </div>
          <Link
            href="/cadets"
            className="rounded-xl border bg-white p-4 shadow-sm transition-colors hover:border-[#003087]/30"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Division</p>
              <FileText className="h-4 w-4 text-[#003087]" />
            </div>
            <p className="mt-2 text-sm font-bold text-[#003087]">View Roster</p>
            <p className="mt-0.5 text-xs text-gray-400">your cadets</p>
          </Link>
        </div>
      )}

      {/* Personal stats strip — shown for non-staff, non-parent members */}
      {!isStaff && myAttendanceTotal > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Attendance */}
          <Link
            href="/profile"
            className="group rounded-xl border bg-[#003087] p-4 text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                My Attendance
              </p>
              <TrendingUp className="h-4 w-4 text-white/30" />
            </div>
            <p className="mt-2 text-3xl font-extrabold">{myAttendancePct}%</p>
            <p className="mt-0.5 text-xs text-white/40">{myAttendanceTotal} events</p>
          </Link>
          {/* Quals */}
          <Link
            href="/profile"
            className="group rounded-xl border bg-white p-4 shadow-sm transition-colors hover:border-[#003087]/30"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                My Quals
              </p>
              <CheckSquare className="h-4 w-4 text-[#003087]" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-[#003087]">
              {myQualsDone}
              <span className="text-lg text-gray-300">/{totalQuals}</span>
            </p>
            <p className="mt-0.5 text-xs text-gray-400">completed</p>
          </Link>
          {/* Docs */}
          <Link
            href="/docs"
            className={`group rounded-xl border p-4 shadow-sm transition-colors ${
              missingDocsCount > 0 ? "border-amber-200 bg-amber-50" : "bg-white hover:border-green-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-xs font-semibold uppercase tracking-wide ${missingDocsCount > 0 ? "text-amber-500" : "text-gray-400"}`}>
                Missing Docs
              </p>
              <FileWarning className={`h-4 w-4 ${missingDocsCount > 0 ? "text-amber-500" : "text-gray-300"}`} />
            </div>
            {missingDocsCount > 0 ? (
              <>
                <p className="mt-2 text-3xl font-extrabold text-amber-600">{missingDocsCount}</p>
                <p className="mt-0.5 text-xs text-amber-500">required</p>
              </>
            ) : (
              <>
                <p className="mt-2 text-xl font-extrabold text-green-600">All Clear</p>
                <p className="mt-0.5 text-xs text-gray-400">docs up to date</p>
              </>
            )}
          </Link>
          {/* Status */}
          <Link
            href="/profile"
            className={`group rounded-xl border p-4 shadow-sm transition-colors hover:border-opacity-50 ${
              myOpenCorrections > 0
                ? "border-red-200 bg-red-50"
                : "bg-white hover:border-green-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <p
                className={`text-xs font-semibold uppercase tracking-wide ${
                  myOpenCorrections > 0 ? "text-red-400" : "text-gray-400"
                }`}
              >
                My Status
              </p>
              <Shield
                className={`h-4 w-4 ${
                  myOpenCorrections > 0 ? "text-red-500" : "text-green-500"
                }`}
              />
            </div>
            {myOpenCorrections > 0 ? (
              <>
                <p className="mt-2 text-3xl font-extrabold text-red-600">
                  {myOpenCorrections}
                </p>
                <p className="mt-0.5 text-xs text-red-400">
                  open item{myOpenCorrections !== 1 ? "s" : ""}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-xl font-extrabold text-green-600">Clear</p>
                <p className="mt-0.5 text-xs text-gray-400">no open items</p>
              </>
            )}
          </Link>
        </div>
      )}

      {/* Recent absence request decisions */}
      {recentAbsenceDecisions.length > 0 && (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <Bell className="h-4 w-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900">Absence Request Updates</p>
          </div>
          <div className="divide-y">
            {recentAbsenceDecisions.map((r) => {
              const isApproved = r.status === "approved";
              const typeLabel = r.request_type === "early_leave" ? "Early Leave" : r.request_type === "late_arrival" ? "Late Arrival" : "Absence";
              return (
                <div key={r.id} className="flex items-start gap-3 px-4 py-3">
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isApproved ? "bg-green-100" : "bg-red-100"}`}>
                    {isApproved
                      ? <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{typeLabel}</span>{" "}
                      <span className={isApproved ? "text-green-700 font-medium" : "text-red-600 font-medium"}>
                        {isApproved ? "approved" : "denied"}
                      </span>{" "}
                      for {format(new Date(r.requested_date + "T00:00:00"), "MMM d")}
                    </p>
                    {r.review_notes && (
                      <p className="mt-0.5 text-xs text-gray-500 italic">&ldquo;{r.review_notes}&rdquo;</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t px-4 py-2">
            <Link href="/my-record" className="text-xs text-[#003087] hover:underline">View all requests →</Link>
          </div>
        </div>
      )}

      {/* Next Drill Countdown card */}
      {nextDrillSession && (
        <Link href="/calendar" className="block rounded-xl border border-[#003087]/20 bg-gradient-to-r from-[#003087]/5 to-[#003087]/10 p-4 hover:from-[#003087]/10 hover:to-[#003087]/15 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#003087]/60">Next Drill</p>
            <CalendarDays className="h-4 w-4 text-[#003087]/40" />
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
            <div>
              <p className="text-3xl font-extrabold text-[#003087]">
                {drillCountdown(nextDrillSession.date)}
              </p>
              <p className="text-sm font-medium text-[#003087]/70">
                {format(new Date(nextDrillSession.date + "T00:00:00"), "EEEE, MMMM d")}
              </p>
              {nextDrillSession.theme && (
                <p className="mt-0.5 text-xs text-[#003087]/60 italic">{nextDrillSession.theme}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-[#003087]/60">
              {nextDrillSession.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {nextDrillSession.location}
                </span>
              )}
              {nextDrillSession.uniform_of_day && (
                <span className="flex items-center gap-1">
                  <Shirt className="h-3.5 w-3.5" />
                  {nextDrillSession.uniform_of_day}
                </span>
              )}
            </div>
          </div>
        </Link>
      )}

      {/* TSW Next Meeting Countdown card */}
      {nextTswSession && (
        <Link href="/tsw-pod" className="block rounded-xl border border-orange-300/40 bg-gradient-to-r from-orange-50 to-orange-100/50 p-4 hover:from-orange-100/50 hover:to-orange-100 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600/70">Next TSW Meeting</p>
            <Ship className="h-4 w-4 text-orange-400/60" />
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
            <div>
              <p className="text-3xl font-extrabold text-orange-700">
                {drillCountdown(nextTswSession.date)}
              </p>
              <p className="text-sm font-medium text-orange-600/80">
                {format(new Date(nextTswSession.date + "T00:00:00"), "EEEE, MMMM d")}
              </p>
              {nextTswSession.theme && (
                <p className="mt-0.5 text-xs text-orange-600/60 italic">{nextTswSession.theme}</p>
              )}
            </div>
          </div>
        </Link>
      )}

      {/* Time in rate (personal stats for non-staff, non-parent) */}
      {!isStaff && profile.role === "cadet" && profile.date_of_rank && (
        <div className="flex items-center gap-3 rounded-xl border bg-white p-3.5 shadow-sm">
          <Award className="h-5 w-5 shrink-0 text-[#B8860B]" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Time in Rate</p>
            <p className="font-bold text-[#003087]">
              {timeInRate(profile.date_of_rank)}
              {profile.rank && <span className="ml-1.5 text-sm font-normal text-gray-500">as {profile.rank}</span>}
            </p>
          </div>
        </div>
      )}

      {/* Saved links */}
      {savedLinks.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Quick Links</p>
          <div className="flex flex-wrap gap-2">
            {savedLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-[#003087]/30 hover:bg-[#003087]/5 hover:text-[#003087]"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                {link.title}
              </a>
            ))}
            {isStaff && (
              <Link
                href="/admin/links"
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:border-[#003087]/30 hover:text-[#003087]"
              >
                <Plus className="h-3.5 w-3.5" /> Manage Links
              </Link>
            )}
          </div>
        </div>
      )}
      {savedLinks.length === 0 && isStaff && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Quick Links</p>
          <Link
            href="/admin/links"
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:border-[#003087]/30 hover:text-[#003087] w-fit"
          >
            <Link2 className="h-3.5 w-3.5" /> Add quick links
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Members</p>
            <Users className="h-4 w-4 text-[#003087]" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-[#003087]">{memberCount}</p>
          <p className="mt-0.5 text-xs text-gray-400">active & approved</p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Events</p>
            <CalendarDays className="h-4 w-4 text-[#003087]" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-[#003087]">{events.length}</p>
          <p className="mt-0.5 text-xs text-gray-400">upcoming</p>
        </div>

        {isStaff ? (
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Pending</p>
              <UserCheck className="h-4 w-4 text-[#B8860B]" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-[#B8860B]">{pendingCount}</p>
            <Link href="/admin" className="mt-0.5 block text-xs text-[#003087] hover:underline">
              review approvals →
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Alerts</p>
              <Bell className="h-4 w-4 text-[#003087]" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-red-600">{urgent.length}</p>
            <p className="mt-0.5 text-xs text-gray-400">urgent notices</p>
          </div>
        )}

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Billet</p>
            <Anchor className="h-4 w-4 text-[#003087]" />
          </div>
          {profile.billet ? (
            <>
              <p className="mt-2 truncate text-sm font-bold text-[#003087]">{profile.billet}</p>
              <Link href="/billets" className="mt-0.5 block text-xs text-gray-400 hover:underline">
                view all billets →
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm font-semibold text-gray-300">—</p>
              <p className="mt-0.5 text-xs text-gray-400">unassigned</p>
            </>
          )}
        </div>
      </div>

      {/* Operations summary for command */}
      {(openCorrectionsCount != null || activePipelinesCount != null || pendingAbsenceCount != null) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {openCorrectionsCount != null && (
            <Link
              href="/corrections"
              className="rounded-xl border bg-white p-4 shadow-sm hover:border-[#003087]/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Corrections</p>
                <TrendingUp className="h-4 w-4 text-red-500" />
              </div>
              <p className={`mt-2 text-3xl font-extrabold ${openCorrectionsCount > 0 ? "text-red-600" : "text-gray-400"}`}>
                {openCorrectionsCount}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">open</p>
            </Link>
          )}
          {openPipsCount != null && (
            <Link
              href="/corrections"
              className="rounded-xl border bg-white p-4 shadow-sm hover:border-[#003087]/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">PIPs</p>
                <ClipboardCheck className="h-4 w-4 text-amber-500" />
              </div>
              <p className={`mt-2 text-3xl font-extrabold ${(openPipsCount ?? 0) > 0 ? "text-amber-600" : "text-gray-400"}`}>
                {openPipsCount ?? 0}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">open</p>
            </Link>
          )}
          {activePipelinesCount != null && (
            <Link
              href="/nominations"
              className="rounded-xl border bg-white p-4 shadow-sm hover:border-[#003087]/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Nominations</p>
                <TrendingUp className="h-4 w-4 text-[#003087]" />
              </div>
              <p className={`mt-2 text-3xl font-extrabold ${(activePipelinesCount ?? 0) > 0 ? "text-[#003087]" : "text-gray-400"}`}>
                {activePipelinesCount ?? 0}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">in pipeline</p>
            </Link>
          )}
          {pendingAbsenceCount != null && (
            <Link
              href="/absence-requests"
              className="rounded-xl border bg-white p-4 shadow-sm hover:border-amber-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Absence Requests</p>
                <Bell className="h-4 w-4 text-amber-500" />
              </div>
              <p className={`mt-2 text-3xl font-extrabold ${pendingAbsenceCount > 0 ? "text-amber-600" : "text-gray-400"}`}>
                {pendingAbsenceCount}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">pending review</p>
            </Link>
          )}
        </div>
      )}

      {/* Stale absence request alert */}
      {(staleAbsenceCount ?? 0) > 0 && (
        <Link
          href="/absence-requests"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-600">Overdue Review</p>
            <p className="font-semibold text-amber-900">
              {staleAbsenceCount} absence {staleAbsenceCount === 1 ? "request" : "requests"} pending for 3+ days — review now
            </p>
          </div>
        </Link>
      )}

      {/* Submitted POD approval reminder (CO/XO only) */}
      {(submittedPodCount ?? 0) > 0 && (
        <Link
          href="/pod"
          className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 transition-colors hover:bg-blue-100"
        >
          <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">POD Pending Approval</p>
            <p className="font-semibold text-blue-900">
              {submittedPodCount} Plan of the Day {submittedPodCount === 1 ? "submission needs" : "submissions need"} your approval
            </p>
          </div>
        </Link>
      )}

      {/* Getting Started card for new staff (first 30 days) */}
      {isNewStaff && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-green-700">Getting Started</p>
          <p className="mt-1 font-semibold text-green-900">Welcome to the staff portal — here&apos;s what to do first:</p>
          <ol className="mt-2 space-y-1 text-sm text-green-800 list-decimal list-inside">
            <li>Review the <Link href="/roster" className="underline font-medium">Roster</Link> to learn your cadets&apos; names and ranks</li>
            <li>Check <Link href="/divisions" className="underline font-medium">Divisions</Link> to see your assigned section</li>
            <li>Read the latest <Link href="/announcements" className="underline font-medium">Announcements</Link> for standing orders</li>
            <li>Check the <Link href="/pod" className="underline font-medium">Plan of the Day</Link> before each drill</li>
            <li>Use the <strong>Help</strong> buttons (?) on each page for step-by-step guidance</li>
          </ol>
        </div>
      )}

      {/* Urgent alerts */}
      {urgent.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-red-500">Urgent</p>
            <p className="font-semibold text-red-800">{a.title}</p>
          </div>
        </div>
      ))}

      {/* Today's POD */}
      {todayPod && ((todayPod.items?.length ?? 0) > 0 || todayPod.notes || todayPod.uniform_of_day) && (
        <Link
          href="/pod"
          className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-4 transition-colors hover:bg-blue-100"
        >
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
                Today&apos;s Plan of the Day
              </p>
              {todayPod.uniform_of_day && (
                <p className="text-sm font-medium text-blue-700">
                  Uniform: {todayPod.uniform_of_day}
                </p>
              )}
              {todayPod.items?.[0] && (
                <p className="text-sm text-blue-600">
                  First evolution: {todayPod.items[0].time} — {todayPod.items[0].activity}
                  {todayPod.items[0].location ? ` · ${todayPod.items[0].location}` : ""}
                </p>
              )}
              {(todayPod.items?.length ?? 0) > 1 && (
                <p className="text-xs text-blue-400">
                  +{(todayPod.items?.length ?? 0) - 1} more items
                </p>
              )}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-blue-400" />
        </Link>
      )}

      {/* My Profile link for cadets */}
      {!isStaff && (
        <div className="flex flex-col gap-2">
          <Link
            href="/profile"
            className="flex items-center justify-between rounded-xl border border-[#003087]/10 bg-[#003087]/5 p-3.5 transition-colors hover:bg-[#003087]/10"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-[#003087]" />
              <div>
                <p className="text-sm font-semibold text-[#003087]">My Profile</p>
                <p className="text-xs text-[#003087]/60">Attendance, quals &amp; board history</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#003087]/40" />
          </Link>
          <Link
            href="/my-record#absence"
            className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3.5 transition-colors hover:bg-amber-100"
          >
            <div className="flex items-center gap-3">
              <CalendarOff className="h-5 w-5 text-amber-700" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Request Absence / Early Leave</p>
                <p className="text-xs text-amber-700/70">Submit an absence or excuse request</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-400" />
          </Link>
        </div>
      )}

      {/* Absence / early leave for staff (my record) */}
      {isStaff && (
        <div className="flex flex-col gap-2">
          <Link
            href="/my-record#absence"
            className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3.5 transition-colors hover:bg-amber-100"
          >
            <div className="flex items-center gap-3">
              <CalendarOff className="h-5 w-5 text-amber-700" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Request Absence / Early Leave</p>
                <p className="text-xs text-amber-700/70">Submit a personal absence or early departure request</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-400" />
          </Link>
        </div>
      )}

      {/* Quick actions for staff — role-personalized */}
      {isStaff && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {/* LCPO: Drill Muster is their primary action */}
            {profile.is_lcpo ? (
              <Link
                href="/drill"
                className="flex items-center gap-1.5 rounded-lg border border-[#003087]/20 bg-[#003087] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#003087]/80"
              >
                <ClipboardCheck className="h-4 w-4" /> Drill Muster
              </Link>
            ) : (
              <Link
                href="/attendance"
                className="flex items-center gap-1.5 rounded-lg border border-[#003087]/20 bg-[#003087]/5 px-3 py-2 text-sm font-medium text-[#003087] transition-colors hover:bg-[#003087]/10"
              >
                <ClipboardCheck className="h-4 w-4" /> Take Attendance
              </Link>
            )}
            <Link
              href="/announcements"
              className="flex items-center gap-1.5 rounded-lg border border-[#003087]/20 bg-[#003087]/5 px-3 py-2 text-sm font-medium text-[#003087] transition-colors hover:bg-[#003087]/10"
            >
              <Megaphone className="h-4 w-4" /> Post Announcement
            </Link>
            {/* Officers see POD as a priority action */}
            {(profile.role === "officer") && (
              <Link
                href="/pod"
                className="flex items-center gap-1.5 rounded-lg border border-[#003087]/20 bg-[#003087]/5 px-3 py-2 text-sm font-medium text-[#003087] transition-colors hover:bg-[#003087]/10"
              >
                <ClipboardList className="h-4 w-4" /> Plan of the Day
              </Link>
            )}
            {/* NCOs get direct drill attendance */}
            {profile.role === "nco" && (
              <Link
                href="/drill"
                className="flex items-center gap-1.5 rounded-lg border border-[#003087]/20 bg-[#003087]/5 px-3 py-2 text-sm font-medium text-[#003087] transition-colors hover:bg-[#003087]/10"
              >
                <Plus className="h-4 w-4" /> Drill Muster
              </Link>
            )}
            {(profile.role === "officer" || profile.role === "snco") && (
              <>
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 rounded-lg border border-[#B8860B]/20 bg-[#B8860B]/5 px-3 py-2 text-sm font-medium text-[#B8860B] transition-colors hover:bg-[#B8860B]/10"
                >
                  <UserCheck className="h-4 w-4" /> Manage Members
                </Link>
                <Link
                  href="/report"
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                >
                  <BarChart2 className="h-4 w-4" /> Unit Report
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Upcoming Events */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold text-gray-800">Upcoming Events</h2>
            <Link href="/calendar" className="text-xs font-medium text-[#003087] hover:underline">
              View calendar →
            </Link>
          </div>
          <div className="divide-y">
            {events.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-400">No upcoming events.</p>
            )}
            {events.map((evt) => (
              <div key={evt.id} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5 flex w-12 shrink-0 flex-col items-center rounded-lg border border-[#003087]/10 bg-[#003087]/5 py-1.5 text-center">
                  <span className="text-[10px] font-bold uppercase text-[#003087]/50">
                    {format(new Date(evt.start_time), "MMM")}
                  </span>
                  <span className="text-lg font-extrabold leading-none text-[#003087]">
                    {format(new Date(evt.start_time), "d")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold text-gray-800">{evt.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {eventDateLabel(evt.start_time)},{" "}
                      {format(new Date(evt.start_time), "HH:mm")}
                    </span>
                    {evt.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {evt.location}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                    EVENT_TYPE_COLORS[evt.event_type] ?? EVENT_TYPE_COLORS.other
                  }`}
                >
                  {evt.event_type.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Announcements */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold text-gray-800">Latest Announcements</h2>
            <Link href="/announcements" className="text-xs font-medium text-[#003087] hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y">
            {announcements.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-400">No announcements yet.</p>
            )}
            {announcements.map((a) => (
              <div
                key={a.id}
                className={`border-l-4 px-4 py-3 ${
                  a.priority === "urgent"
                    ? "border-l-red-500 bg-red-50/40"
                    : a.priority === "important"
                    ? "border-l-amber-400 bg-amber-50/30"
                    : "border-l-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-800">{a.title}</p>
                  {a.priority !== "general" && (
                    <Badge
                      variant={a.priority === "urgent" ? "destructive" : "default"}
                      className="shrink-0 text-[10px] capitalize"
                    >
                      {a.priority}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {a.profiles?.rank ? `${a.profiles.rank} ` : ""}
                  {a.profiles?.full_name ?? "Staff"} &middot;{" "}
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
