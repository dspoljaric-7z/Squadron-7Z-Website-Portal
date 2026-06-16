import type { EventType, AnnouncementPriority, AttendanceStatus } from "@/types/database";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  drill: "Drill",
  training: "Training Evolution",
  ceremony: "Ceremony",
  community_service: "Community Service",
  other: "Other",
};

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  drill: "bg-[#003087] text-white",
  training: "bg-blue-100 text-blue-800",
  ceremony: "bg-[#B8860B] text-white",
  community_service: "bg-green-100 text-green-800",
  other: "bg-gray-100 text-gray-800",
};

export const PRIORITY_COLORS: Record<AnnouncementPriority, string> = {
  general: "bg-gray-100 text-gray-700",
  important: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-700",
};

export const ATTENDANCE_COLORS: Record<AttendanceStatus, string> = {
  present: "bg-green-100 text-green-800 border-green-300",
  absent: "bg-red-100 text-red-800 border-red-300",
  excused: "bg-amber-100 text-amber-800 border-amber-300",
};
