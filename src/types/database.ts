export type UserRole = "cadet" | "nco" | "snco" | "officer" | "parent";
export type AttendanceStatus = "present" | "absent" | "excused";
export type AnnouncementPriority = "general" | "important" | "urgent";
export type EventType = "drill" | "training" | "ceremony" | "community_service" | "other";
export type PodCategory = "formation" | "training" | "meal" | "admin" | "general";

export type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  role: UserRole;
  rank: string | null;
  billet: string | null;
  bio: string | null;
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

export type Announcement = {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  image_url: string | null;
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

export type SiteSettings = {
  id: number;
  unit_name: string;
  motto: string;
  logo_url: string | null;
  auto_approve_registrations: boolean;
}

export type PodItem = {
  id: string;
  time: string;
  activity: string;
  location: string;
  category: PodCategory;
  responsible_id: string | null;
  responsible_name: string | null;
}

export type PlanOfDay = {
  id: string;
  date: string;
  uniform_of_day: string | null;
  watch_bill: string | null;
  items: PodItem[];
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

export type PodTemplate = {
  id: string;
  name: string;
  description: string | null;
  items: PodItem[];
  uniform_of_day: string | null;
  watch_bill: string | null;
  created_by: string | null;
  created_at: string;
}

export type Billet = {
  id: string;
  name: string;
  description: string | null;
  duties: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile>; Relationships: [] };
      events: { Row: Event; Insert: Partial<Event>; Update: Partial<Event>; Relationships: [] };
      attendance: { Row: Attendance; Insert: Partial<Attendance>; Update: Partial<Attendance>; Relationships: [] };
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
    };
    Views: Record<string, never>;
    Functions: {
      consume_invite_code: {
        Args: { p_code: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
