import type { EventType, AnnouncementPriority, AttendanceStatus, DrillAttendanceStatus, NominationStage, ProspectStage, IdeaCategory, QualStatus, IssueCategory } from "@/types/database";

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

export const DRILL_ATTENDANCE_COLORS: Record<DrillAttendanceStatus, string> = {
  present: "bg-green-100 text-green-800 border-green-300",
  absent: "bg-red-100 text-red-800 border-red-300",
  excused: "bg-amber-100 text-amber-800 border-amber-300",
  late: "bg-orange-100 text-orange-800 border-orange-300",
};

export const DRILL_ATTENDANCE_LABELS: Record<DrillAttendanceStatus, string> = {
  present: "P",
  absent: "A",
  excused: "E",
  late: "L",
};

// Division color coding — used throughout the UI
export const DIVISION_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Alpha:            { bg: "bg-blue-100",   text: "text-blue-800",   border: "border-blue-300",   dot: "bg-blue-500" },
  Bravo:            { bg: "bg-red-100",    text: "text-red-800",    border: "border-red-300",    dot: "bg-red-500" },
  Delta:            { bg: "bg-green-100",  text: "text-green-800",  border: "border-green-300",  dot: "bg-green-500" },
  Echo:             { bg: "bg-amber-100",  text: "text-amber-800",  border: "border-amber-300",  dot: "bg-amber-500" },
  "Unit Leadership":{ bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300", dot: "bg-purple-500" },
};

// Billet seniority order (lower = more senior)
export const BILLET_RANK: Record<string, number> = {
  "Commanding Officer": 1,
  "Executive Officer": 2,
  "Operations Officer": 3,
  "Command Chief": 4,
  "Alpha Division Commander": 5,
  "Bravo Division Commander": 6,
  "Delta Division Commander": 7,
  "Echo Division Commander": 8,
  "Alpha Division Petty Officer": 9,
  "Bravo Division Petty Officer": 10,
  "Delta Division Petty Officer": 11,
  "Echo Division Petty Officer": 12,
  "Assistant Alpha Division Petty Officer": 13,
  "Assistant Bravo Division Petty Officer": 14,
  "Assistant Delta Division Petty Officer": 15,
  "Assistant Echo Division Petty Officer": 16,
  "Master-at-Arms": 17,
  "Assistant Master-at-Arms": 18,
  "Yeoman": 19,
  "Logistics Petty Officer": 20,
  "Historian": 21,
  "Public Affairs Petty Officer": 22,
  "Recruiting Petty Officer": 23,
  "DPO": 24,
};

export const BILLET_OPTIONS = Object.keys(BILLET_RANK);

// Training phases by rank string
export const RANK_PHASE: Record<string, string> = {
  "SR": "Phase I — Recruit",
  "SA": "Phase I — Recruit",
  "SN": "Phase II — Apprentice",
  "AN": "Phase II — Apprentice",
  "AA": "Phase II — Apprentice",
  "FN": "Phase II — Apprentice",
  "FA": "Phase II — Apprentice",
  "SN (E-3)": "Phase II — Apprentice",
  "PO3": "Phase III — Petty Officer",
  "PO2": "Phase III — Petty Officer",
  "PO1": "Phase IV — Senior Petty Officer",
  "CPO": "Phase IV — Senior Petty Officer",
  "SCPO": "Phase IV — Senior Petty Officer",
  "MCPO": "Phase IV — Senior Petty Officer",
};

// Qualification types
export const QUAL_TYPES: string[] = [
  "First Aid / CPR",
  "Watch Standing",
  "Color Guard",
  "Marksmanship",
  "DPO Qualification",
  "PO1 Board",
  "Practice CPO Board",
];

export const QUAL_STATUS_LABELS: Record<QualStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

export const QUAL_STATUS_COLORS: Record<QualStatus, string> = {
  not_started: "bg-gray-100 text-gray-600",
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
};

// Nomination stage labels and colors
export const NOMINATION_STAGE_LABELS: Record<NominationStage, string> = {
  nominated: "Nominated",
  applied: "Applied",
  interviewed: "Interviewed",
  approved_probation: "Approved (Probation)",
  confirmed: "Confirmed",
  not_selected: "Not Selected",
};

export const NOMINATION_STAGE_COLORS: Record<NominationStage, string> = {
  nominated: "bg-blue-100 text-blue-800",
  applied: "bg-purple-100 text-purple-800",
  interviewed: "bg-amber-100 text-amber-800",
  approved_probation: "bg-orange-100 text-orange-800",
  confirmed: "bg-green-100 text-green-800",
  not_selected: "bg-gray-100 text-gray-600",
};

// Recruiting prospect stages
export const PROSPECT_STAGE_LABELS: Record<ProspectStage, string> = {
  prospect: "Prospect",
  contacted: "Contacted",
  interested: "Interested",
  applied: "Applied",
  enrolled: "Enrolled",
  inactive: "Inactive",
};

export const PROSPECT_STAGE_COLORS: Record<ProspectStage, string> = {
  prospect: "bg-gray-100 text-gray-700",
  contacted: "bg-blue-100 text-blue-800",
  interested: "bg-purple-100 text-purple-800",
  applied: "bg-amber-100 text-amber-800",
  enrolled: "bg-green-100 text-green-800",
  inactive: "bg-red-100 text-red-700",
};

// Idea categories
export const IDEA_CATEGORY_LABELS: Record<IdeaCategory, string> = {
  drill: "Drill Activity",
  stem: "STEM",
  service: "Community Service",
};

export const IDEA_CATEGORY_COLORS: Record<IdeaCategory, string> = {
  drill: "bg-[#003087] text-white",
  stem: "bg-teal-100 text-teal-800",
  service: "bg-green-100 text-green-800",
};

// Correction tiers
export const CORRECTION_TIER_LABELS: Record<number, string> = {
  1: "Tier I",
  2: "Tier II",
  3: "Tier III",
  4: "Tier IV",
};

export const CORRECTION_TIER_COLORS: Record<number, string> = {
  1: "bg-yellow-100 text-yellow-800",
  2: "bg-orange-100 text-orange-800",
  3: "bg-red-100 text-red-800",
  4: "bg-red-200 text-red-900 font-bold",
};

export const ISSUE_CATEGORY_LABELS: Record<IssueCategory, string> = {
  gear: "Lost/Damaged Gear",
  safety: "Safety / Injury",
  parent_guardian: "Parent/Guardian Concern",
  peer_conflict: "Peer Conflict",
  general: "General",
};
