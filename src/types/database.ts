export type UserRole = "cadet" | "nco" | "snco" | "officer" | "parent";
export type BoardResult = "recommended" | "not_recommended" | "deferred";

export type BoardResultRow = {
  id: string;
  cadet_id: string;
  board_date: string;
  from_rank: string | null;
  to_rank: string | null;
  result: BoardResult;
  notes: string | null;
  posted_by: string | null;
  created_at: string;
};
export type AttendanceStatus = "present" | "absent" | "excused";
export type DrillAttendanceStatus = "present" | "absent" | "excused" | "late";
export type AnnouncementPriority = "general" | "important" | "urgent";
export type AnnouncementAudience = "all" | "officers_sncOs" | "ncos_plus" | "cadets_only";
export type EventType = "drill" | "training" | "ceremony" | "community_service" | "outreach" | "other";
export type PodCategory = "formation" | "pt" | "training" | "meal" | "admin" | "general" | "side_event";
export type NominationStage = "nominated" | "applied" | "interviewed" | "approved_probation" | "confirmed" | "not_selected";
export type CorrectionStatus = "open" | "resolved" | "cleared";
export type PipStatus = "open" | "closed" | "failed" | "pending_ack";
export type IssueCategory = "gear" | "safety" | "parent_guardian" | "peer_conflict" | "general";
export type IssueStatus = "open" | "monitoring" | "resolved";
export type ProspectStage = "prospect" | "contacted" | "interested" | "applied" | "enrolled" | "inactive";
export type ProspectStatus = "prospect" | "contacted" | "visited" | "applied" | "enrolled" | "inactive" | "not_interested";
export type ProspectNoteType = "note" | "call" | "email" | "visit" | "meeting" | "other";

export type Prospect = {
  id: string;
  name: string;
  unit: string | null;
  school: string | null;
  grade: string | null;
  email: string | null;
  phone: string | null;
  guardian_name: string | null;
  guardian_contact: string | null;
  status: ProspectStatus;
  notes: string | null;
  source: string | null;
  first_visit_date: string | null;
  application_date: string | null;
  enrollment_date: string | null;
  created_by: string | null;
  converted_to_profile_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProspectNote = {
  id: string;
  prospect_id: string;
  body: string;
  type: ProspectNoteType;
  created_by: string | null;
  created_at: string;
  author?: { full_name: string; rank: string | null } | null;
};

export type ProspectChecklistItem = {
  id: string;
  prospect_id: string;
  item: string;
  sort_order: number;
  completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
};
export type IdeaCategory = "drill" | "stem" | "service";
export type QualStatus = "not_started" | "in_progress" | "completed";
export type VisitorStatus = "prospect" | "enrolled" | "inactive" | "not_interested";

export type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  role: UserRole;
  rank: string | null;
  billet: string | null;
  billet_2: string | null;
  billet_3: string | null;
  date_of_rank: string | null;
  is_command: boolean;
  is_maa: boolean;
  officer_billet: string | null;
  is_yeoman: boolean;
  is_ops: boolean;
  is_alpo: boolean;
  is_lcpo: boolean;
  can_manage_recruiting: boolean;
  can_manage_advancement: boolean;
  can_manage_drills: boolean;
  can_manage_discipline: boolean;
  can_manage_ideas: boolean;
  can_manage_pod: boolean;
  bio: string | null;
  preferred_name: string | null;
  contact_phone: string | null;
  email: string | null;
  join_date: string | null;
  parent_of: string | null;
  division_id: string | null;
  approved: boolean;
  active: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type Division = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_by: string | null;
  created_at: string;
}

export type Event = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  event_type: EventType;
  recurrence: "none" | "weekly" | "monthly";
  recurrence_end_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TswCalendarEntry = {
  id: string;
  date: string;
  title: string;
  location: string | null;
  plan: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type Attendance = {
  id: string;
  event_id: string;
  cadet_id: string;
  status: AttendanceStatus;
  locked: boolean;
  recorded_by: string | null;
  recorded_at: string;
}

export type DrillSession = {
  id: string;
  date: string;
  location: string | null;
  plan: string | null;
  uniform_of_day: string | null;
  maa_id: string | null;
  recorded_by: string | null;
  notes: string | null;
  locked: boolean;
  created_at: string;
  updated_at: string;
}

export type DrillAttendance = {
  id: string;
  session_id: string;
  cadet_id: string;
  status: DrillAttendanceStatus;
  arrival_time: string | null;
  notes: string | null;
  recorded_by: string | null;
  recorded_at: string;
}

export type DrillVisitor = {
  id: string;
  session_id: string;
  name: string;
  unit: string | null;
  guardian_contact: string | null;
  status: VisitorStatus;
  notes: string | null;
  pre_logged: boolean;
  created_at: string;
}

export type Qualification = {
  id: string;
  cadet_id: string;
  qual_type: string;
  status: QualStatus;
  completed_date: string | null;
  notes: string | null;
  recorded_by: string | null;
  expires_at: string | null;
  never_expires: boolean;
  updated_at: string;
}

export type BilletNomination = {
  id: string;
  cadet_id: string;
  billet_id: string | null;
  billet_name: string;
  stage: NominationStage;
  probation_end_date: string | null;
  nominated_by: string | null;
  approved_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type Correction = {
  id: string;
  cadet_id: string;
  tier: 1 | 2 | 3 | 4;
  description: string;
  issued_by: string | null;
  issued_at: string;
  approved_by: string | null;
  approved_at: string | null;
  status: CorrectionStatus;
  resolution_notes: string | null;
  resolved_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CorrectiveAction = {
  id: string;
  correction_id: string;
  description: string;
  assigned_to: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  completion_notes: string | null;
  created_at: string;
}

export type PipTask = {
  id: string;
  pip_id: string;
  description: string;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  created_by: string | null;
}

export type Pip = {
  id: string;
  cadet_id: string;
  root_cause: string;
  timeline: string | null;
  goals: string | null;
  cadet_signature_date: string | null;
  supervisor_id: string | null;
  supervisor_signature_date: string | null;
  co_id: string | null;
  co_signature_date: string | null;
  status: PipStatus;
  outcome_notes: string | null;
  opened_at: string;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
  updated_at: string;
  // Extended fields
  area_of_concern: string | null;
  specific_requirements: string | null;
  review_date: string | null;
  support_resources: string | null;
  meeting_frequency: string | null;
}

export type UniformInspectionSession = {
  id: string;
  date: string;
  drill_session_id: string | null;
  conducted_by: string | null;
  notes: string | null;
  created_at: string;
}

export type UniformInspectionResult = {
  id: string;
  inspection_session_id: string;
  cadet_id: string;
  passed: boolean;
  deficiencies: string | null;
  notes: string | null;
  scores: Record<string, number> | null;
  created_at: string;
}

export type CadetPaperwork = {
  id: string;
  cadet_id: string;
  doc_type_id: string;
  expiry_date: string | null;
  submitted_date: string | null;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PaperworkDocType = {
  id: string;
  label: string;
  short_label: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export type InspectionItemDef = {
  id: string;
  item_key: string;
  label: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export type OtherIssue = {
  id: string;
  cadet_id: string | null;
  category: IssueCategory;
  title: string;
  description: string | null;
  status: IssueStatus;
  reported_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type RecruitingProspect = {
  id: string;
  name: string;
  age: number | null;
  contact_email: string | null;
  contact_phone: string | null;
  guardian_name: string | null;
  guardian_contact: string | null;
  referred_from: string | null;
  visitor_id: string | null;
  stage: ProspectStage;
  follow_up_date: string | null;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export type ActivityIdea = {
  id: string;
  category: IdeaCategory;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  materials: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AllowedEmail = {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
  notes: string | null;
  added_by: string | null;
  created_at: string;
}

export type Announcement = {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  image_url: string | null;
  expires_at: string | null;
  posted_by: string | null;
  created_at: string;
  updated_at: string;
}

export type StaffNote = {
  id: string;
  cadet_id: string;
  note_body: string;
  posted_by: string | null;
  created_at: string;
}

export type DutyRoster = {
  id: string;
  event_id: string;
  cadet_id: string | null;
  duty_role: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentRow = {
  id: string;
  name: string;
  file_url: string;
  folder: string;
  officer_only: boolean;
  access_roles: UserRole[] | null;
  access_billets: string[] | null;
  uploaded_by: string | null;
  created_at: string;
}

export type PhotoAlbum = {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type Photo = {
  id: string;
  album_id: string;
  url: string;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export type InviteCode = {
  id: string;
  code: string;
  created_by: string | null;
  role_grant: UserRole;
  expires_at: string | null;
  used: boolean;
  used_by: string | null;
  created_at: string;
}

export type ContactInquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  source: string | null;
  reviewed: boolean;
  created_at: string;
};

export type SiteSettings = {
  id: number;
  unit_name: string;
  motto: string;
  logo_url: string | null;
  auto_approve_registrations: boolean;
  co_intent: string | null;
  public_site_enabled: boolean;
}

export type PodItem = {
  id: string;
  time: string;
  activity: string;
  location: string;
  category: PodCategory;
  responsible_id: string | null;
  responsible_name: string | null;
  // Staff-only PT planning fields (not shown to cadets in view mode)
  pt_type?: string;
  pt_notes?: string;
}

export type PodStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export type PlanOfDay = {
  id: string;
  date: string;
  status: PodStatus;
  uniform_of_day: string | null;
  watch_bill: string | null;
  training_objective: string | null;
  officer_in_charge_id: string | null;
  officer_in_charge_name: string | null;
  special_events: string | null;
  safety_brief: string | null;
  items: PodItem[];
  notes: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
  amended_at: string | null;
}

export type PodTemplate = {
  id: string;
  name: string;
  description: string | null;
  items: PodItem[];
  uniform_of_day: string | null;
  watch_bill: string | null;
  training_objective: string | null;
  officer_in_charge_id: string | null;
  officer_in_charge_name: string | null;
  special_events: string | null;
  safety_brief: string | null;
  created_by: string | null;
  created_at: string;
}

export type Billet = {
  id: string;
  name: string;
  description: string | null;
  duties: string | null;
  prerequisites: string | null;
  handoff_notes: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  parent_billet_id: string | null;
  org_section: string | null;
  is_advisory: boolean;
}

export type BilletInterest = {
  id: string;
  cadet_id: string;
  billet_id: string;
  notes: string | null;
  created_at: string;
}

export type CadetChecklist = {
  id: string;
  cadet_id: string;
  type: "onboarding" | "separation";
  step: string;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
}

export type NotificationType = "correction" | "inspection_fail" | "inspection_pass" | "pip_opened" | "rank_advance" | "general";

export type Notification = {
  id: string;
  profile_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

export type RsvpStatus = "attending" | "not_attending" | "maybe";

export type EventRsvp = {
  id: string;
  event_id: string;
  profile_id: string;
  status: RsvpStatus;
  created_at: string;
}

export type AnnouncementRead = {
  id: string;
  announcement_id: string;
  profile_id: string;
  read_at: string;
}

export type WatchBill = {
  id: string;
  session_id: string;
  position: string;
  profile_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type SavedLink = {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  description: string | null;
  visible_to: string;
  sort_order: number;
  created_by: string | null;
  created_at: string;
}

export type EarlyDepartureStatus = "pending" | "approved" | "denied";

export type EarlyDepartureRequest = {
  id: string;
  cadet_id: string;
  session_id: string;
  reason: string | null;
  departure_time: string | null;
  status: EarlyDepartureStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile>; Relationships: [] };
      events: { Row: Event; Insert: Partial<Event>; Update: Partial<Event>; Relationships: [] };
      tsw_calendar: { Row: TswCalendarEntry; Insert: Partial<TswCalendarEntry>; Update: Partial<TswCalendarEntry>; Relationships: [] };
      attendance: { Row: Attendance; Insert: Partial<Attendance>; Update: Partial<Attendance>; Relationships: [] };
      drill_sessions: { Row: DrillSession; Insert: Partial<DrillSession>; Update: Partial<DrillSession>; Relationships: [] };
      drill_attendance: { Row: DrillAttendance; Insert: Partial<DrillAttendance>; Update: Partial<DrillAttendance>; Relationships: [] };
      drill_visitors: { Row: DrillVisitor; Insert: Partial<DrillVisitor>; Update: Partial<DrillVisitor>; Relationships: [] };
      qualifications: { Row: Qualification; Insert: Partial<Qualification>; Update: Partial<Qualification>; Relationships: [] };
      billet_nominations: { Row: BilletNomination; Insert: Partial<BilletNomination>; Update: Partial<BilletNomination>; Relationships: [] };
      corrections: { Row: Correction; Insert: Partial<Correction>; Update: Partial<Correction>; Relationships: [] };
      corrective_actions: { Row: CorrectiveAction; Insert: Partial<CorrectiveAction>; Update: Partial<CorrectiveAction>; Relationships: [] };
      pips: { Row: Pip; Insert: Partial<Pip>; Update: Partial<Pip>; Relationships: [] };
      pip_tasks: { Row: PipTask; Insert: Partial<PipTask>; Update: Partial<PipTask>; Relationships: [] };
      pip_corrections: { Row: { pip_id: string; correction_id: string }; Insert: { pip_id: string; correction_id: string }; Update: { pip_id?: string; correction_id?: string }; Relationships: [] };
      uniform_inspection_sessions: { Row: UniformInspectionSession; Insert: Partial<UniformInspectionSession>; Update: Partial<UniformInspectionSession>; Relationships: [] };
      uniform_inspection_results: { Row: UniformInspectionResult; Insert: Partial<UniformInspectionResult>; Update: Partial<UniformInspectionResult>; Relationships: [] };
      cadet_paperwork: { Row: CadetPaperwork; Insert: Partial<CadetPaperwork>; Update: Partial<CadetPaperwork>; Relationships: [] };
      other_issues: { Row: OtherIssue; Insert: Partial<OtherIssue>; Update: Partial<OtherIssue>; Relationships: [] };
      recruiting_prospects: { Row: RecruitingProspect; Insert: Partial<RecruitingProspect>; Update: Partial<RecruitingProspect>; Relationships: [] };
      activity_ideas: { Row: ActivityIdea; Insert: Partial<ActivityIdea>; Update: Partial<ActivityIdea>; Relationships: [] };
      allowed_emails: { Row: AllowedEmail; Insert: Partial<AllowedEmail>; Update: Partial<AllowedEmail>; Relationships: [] };
      announcements: { Row: Announcement; Insert: Partial<Announcement>; Update: Partial<Announcement>; Relationships: [] };
      staff_notes: { Row: StaffNote; Insert: Partial<StaffNote>; Update: Partial<StaffNote>; Relationships: [] };
      duty_roster: { Row: DutyRoster; Insert: Partial<DutyRoster>; Update: Partial<DutyRoster>; Relationships: [] };
      documents: { Row: DocumentRow; Insert: Partial<DocumentRow>; Update: Partial<DocumentRow>; Relationships: [] };
      photo_albums: { Row: PhotoAlbum; Insert: Partial<PhotoAlbum>; Update: Partial<PhotoAlbum>; Relationships: [] };
      photos: { Row: Photo; Insert: Partial<Photo>; Update: Partial<Photo>; Relationships: [] };
      invite_codes: { Row: InviteCode; Insert: Partial<InviteCode>; Update: Partial<InviteCode>; Relationships: [] };
      site_settings: { Row: SiteSettings; Insert: Partial<SiteSettings>; Update: Partial<SiteSettings>; Relationships: [] };
      plan_of_day: { Row: PlanOfDay; Insert: Partial<PlanOfDay>; Update: Partial<PlanOfDay>; Relationships: [] };
      pod_templates: { Row: PodTemplate; Insert: Partial<PodTemplate>; Update: Partial<PodTemplate>; Relationships: [] };
      billets: { Row: Billet; Insert: Partial<Billet>; Update: Partial<Billet>; Relationships: [] };
      divisions: { Row: Division; Insert: Partial<Division>; Update: Partial<Division>; Relationships: [] };
      event_rsvps: { Row: EventRsvp; Insert: Partial<EventRsvp>; Update: Partial<EventRsvp>; Relationships: [] };
      announcement_reads: { Row: AnnouncementRead; Insert: Partial<AnnouncementRead>; Update: Partial<AnnouncementRead>; Relationships: [] };
      watch_bills: { Row: WatchBill; Insert: Partial<WatchBill>; Update: Partial<WatchBill>; Relationships: [] };
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification>; Relationships: [] };
      saved_links: { Row: SavedLink; Insert: Partial<SavedLink>; Update: Partial<SavedLink>; Relationships: [] };
      early_departure_requests: { Row: EarlyDepartureRequest; Insert: Partial<EarlyDepartureRequest>; Update: Partial<EarlyDepartureRequest>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      consume_invite_code: { Args: { p_code: string }; Returns: string };
      is_command: { Args: Record<never, never>; Returns: boolean };
      is_maa_or_command: { Args: Record<never, never>; Returns: boolean };
      is_staff_member: { Args: Record<never, never>; Returns: boolean };
      billet_seniority: { Args: { billet_name: string }; Returns: number };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
