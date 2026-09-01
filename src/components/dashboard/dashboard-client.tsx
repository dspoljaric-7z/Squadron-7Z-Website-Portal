"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { Badge } from "@/components/ui/badge";
import { roleLabel } from "@/lib/format";
import type { Announcement, Attendance, Event, PlanOfDay, Profile } from "@/types/database";
import {
  CalendarDays,
  Megaphone,
  UserCheck,
  Anchor,
  Users,
  ClipboardList,
  ChevronRight,
  AlertCircle,
  Bell,
  Clock,
  MapPin,
  Plus,
  ClipboardCheck,
  TrendingUp,
  CheckSquare,
  Shield,
  BookOpen,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";

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
}: {
  profile: Profile;
  initialEvents: Event[];
  initialAnnouncements: AnnouncementWithAuthor[];
  initialPendingCount: number;
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
}) {
  const [events, setEvents] = useState(initialEvents);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [pendingCount, setPendingCount] = useState(initialPendingCount);

  const isStaff = profile.role === "officer" || profile.role === "snco" || profile.role === "nco";

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
                      {eventDateLabel(evt.start_time)}, {format(new Date(evt.start_time), "h:mm a")}
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

      {/* Personal stats strip — shown for non-staff, non-parent members */}
      {!isStaff && myAttendanceTotal > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {/* Attendance */}
          <Link
            href="/my-record"
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
            href="/my-record"
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
              <span className="text-lg text-gray-300">/7</span>
            </p>
            <p className="mt-0.5 text-xs text-gray-400">completed</p>
          </Link>
          {/* Status */}
          <Link
            href="/my-record"
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
      {(openCorrectionsCount != null || activePipelinesCount != null) && (
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

      {/* My Record link for cadets */}
      {!isStaff && (
        <Link
          href="/my-record"
          className="flex items-center justify-between rounded-xl border border-[#003087]/10 bg-[#003087]/5 p-3.5 transition-colors hover:bg-[#003087]/10"
        >
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-[#003087]" />
            <div>
              <p className="text-sm font-semibold text-[#003087]">My Record</p>
              <p className="text-xs text-[#003087]/60">Attendance, quals, status &amp; upcoming drills</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-[#003087]/40" />
        </Link>
      )}

      {/* Quick actions for staff */}
      {isStaff && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/attendance"
              className="flex items-center gap-1.5 rounded-lg border border-[#003087]/20 bg-[#003087]/5 px-3 py-2 text-sm font-medium text-[#003087] transition-colors hover:bg-[#003087]/10"
            >
              <ClipboardCheck className="h-4 w-4" /> Take Attendance
            </Link>
            <Link
              href="/announcements"
              className="flex items-center gap-1.5 rounded-lg border border-[#003087]/20 bg-[#003087]/5 px-3 py-2 text-sm font-medium text-[#003087] transition-colors hover:bg-[#003087]/10"
            >
              <Megaphone className="h-4 w-4" /> Post Announcement
            </Link>
            <Link
              href="/pod"
              className="flex items-center gap-1.5 rounded-lg border border-[#003087]/20 bg-[#003087]/5 px-3 py-2 text-sm font-medium text-[#003087] transition-colors hover:bg-[#003087]/10"
            >
              <Plus className="h-4 w-4" /> Edit POD
            </Link>
            {(profile.role === "officer" || profile.role === "snco") && (
              <Link
                href={profile.role === "officer" ? "/admin" : "/divisions"}
                className="flex items-center gap-1.5 rounded-lg border border-[#B8860B]/20 bg-[#B8860B]/5 px-3 py-2 text-sm font-medium text-[#B8860B] transition-colors hover:bg-[#B8860B]/10"
              >
                <UserCheck className="h-4 w-4" /> {profile.role === "officer" ? "Manage Members" : "Divisions"}
              </Link>
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
                      {format(new Date(evt.start_time), "h:mm a")}
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
