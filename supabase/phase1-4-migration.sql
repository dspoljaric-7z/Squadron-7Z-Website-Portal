-- ============================================================
-- SQ7-Portal Phase 1-4 Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- PRE-FLIGHT: Extend enums
-- ============================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'snco';

-- ============================================================
-- PHASE 1: Role model additions
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_command boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_maa boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billet_2 text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billet_3 text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_rank date;

-- ============================================================
-- PHASE 2: Drill attendance (separate from events)
-- ============================================================

CREATE TABLE IF NOT EXISTS drill_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  location text,
  plan text,
  uniform_of_day text,
  maa_id uuid REFERENCES profiles(id),
  recorded_by uuid REFERENCES profiles(id),
  notes text,
  locked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drill_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES drill_sessions(id) ON DELETE CASCADE,
  cadet_id uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'absent' CHECK (status IN ('present','absent','excused','late')),
  notes text,
  recorded_by uuid REFERENCES profiles(id),
  recorded_at timestamptz DEFAULT now(),
  UNIQUE(session_id, cadet_id)
);

CREATE TABLE IF NOT EXISTS drill_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES drill_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text,
  guardian_contact text,
  status text DEFAULT 'prospect' CHECK (status IN ('prospect','enrolled','inactive','not_interested')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- TSW (higher-echelon) calendar
CREATE TABLE IF NOT EXISTS tsw_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  title text NOT NULL,
  location text,
  plan text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Qualifications per cadet
CREATE TABLE IF NOT EXISTS qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadet_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  qual_type text NOT NULL,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  completed_date date,
  notes text,
  recorded_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(cadet_id, qual_type)
);

-- Billet nomination / promotion workflow
CREATE TABLE IF NOT EXISTS billet_nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadet_id uuid NOT NULL REFERENCES profiles(id),
  billet_id uuid,
  billet_name text NOT NULL,
  stage text NOT NULL DEFAULT 'nominated' CHECK (stage IN ('nominated','applied','interviewed','approved_probation','confirmed','not_selected')),
  probation_end_date date,
  nominated_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PHASE 3: Restricted modules
-- ============================================================

-- Correction records (Command-only)
CREATE TABLE IF NOT EXISTS corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadet_id uuid NOT NULL REFERENCES profiles(id),
  tier integer NOT NULL CHECK (tier IN (1,2,3,4)),
  description text NOT NULL,
  issued_by uuid REFERENCES profiles(id),
  issued_at timestamptz DEFAULT now(),
  -- Tier III/IV require Duty Officer approval
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  -- Status lifecycle
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','cleared')),
  resolution_notes text,
  resolved_at timestamptz,
  -- Retention: T1/T2 clear at annual inspection unless PIP open; T3/T4 1 year
  expires_at date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS corrective_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correction_id uuid NOT NULL REFERENCES corrections(id) ON DELETE CASCADE,
  description text NOT NULL,
  assigned_to uuid REFERENCES profiles(id),
  due_date date,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  completion_notes text,
  created_at timestamptz DEFAULT now()
);

-- PIPs (Performance Improvement Plans) — tied to Appendix C structure
CREATE TABLE IF NOT EXISTS pips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadet_id uuid NOT NULL REFERENCES profiles(id),
  root_cause text NOT NULL,
  timeline text,
  goals text,
  -- Signatures per Appendix C
  cadet_signature_date date,
  supervisor_id uuid REFERENCES profiles(id),
  supervisor_signature_date date,
  co_id uuid REFERENCES profiles(id),
  co_signature_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','failed')),
  outcome_notes text,
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pip_corrections (
  pip_id uuid REFERENCES pips(id) ON DELETE CASCADE,
  correction_id uuid REFERENCES corrections(id) ON DELETE CASCADE,
  PRIMARY KEY (pip_id, correction_id)
);

-- Uniform inspection sessions (MAA-facing)
CREATE TABLE IF NOT EXISTS uniform_inspection_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  drill_session_id uuid REFERENCES drill_sessions(id),
  conducted_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS uniform_inspection_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_session_id uuid NOT NULL REFERENCES uniform_inspection_sessions(id) ON DELETE CASCADE,
  cadet_id uuid NOT NULL REFERENCES profiles(id),
  passed boolean NOT NULL,
  deficiencies text,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(inspection_session_id, cadet_id)
);

-- Other Issues watch log (Command-only)
CREATE TABLE IF NOT EXISTS other_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadet_id uuid REFERENCES profiles(id),
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('gear','safety','parent_guardian','peer_conflict','general')),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','monitoring','resolved')),
  reported_by uuid REFERENCES profiles(id),
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PHASE 4: Supporting modules
-- ============================================================

-- Recruiting CRM
CREATE TABLE IF NOT EXISTS recruiting_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  age integer,
  contact_email text,
  contact_phone text,
  guardian_name text,
  guardian_contact text,
  referred_from text,
  visitor_id uuid REFERENCES drill_visitors(id),
  stage text NOT NULL DEFAULT 'prospect' CHECK (stage IN ('prospect','contacted','interested','applied','enrolled','inactive')),
  follow_up_date date,
  notes text,
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activity ideas bank (drill / STEM / service)
CREATE TABLE IF NOT EXISTS activity_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('drill','stem','service')),
  title text NOT NULL,
  description text,
  duration_minutes integer,
  materials text,
  difficulty text CHECK (difficulty IN ('easy','medium','hard')),
  submitted_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Allowed Google OAuth emails (access control, replaces Groups Sync)
CREATE TABLE IF NOT EXISTS allowed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role_grant text NOT NULL DEFAULT 'cadet',
  notes text,
  added_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- RLS: enable on all new tables
-- ============================================================

ALTER TABLE drill_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tsw_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE billet_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pips ENABLE ROW LEVEL SECURITY;
ALTER TABLE pip_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE uniform_inspection_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE uniform_inspection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE other_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruiting_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper functions (SECURITY DEFINER so RLS can call them)
-- ============================================================

CREATE OR REPLACE FUNCTION is_command()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND is_command = true AND approved = true
  );
$$;

CREATE OR REPLACE FUNCTION is_maa_or_command()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND (is_maa = true OR is_command = true) AND approved = true
  );
$$;

CREATE OR REPLACE FUNCTION is_staff_member()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role IN ('officer','snco','nco') AND approved = true
  );
$$;

CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- RLS Policies
-- ============================================================

-- drill_sessions: staff manage, all approved read
CREATE POLICY "staff_manage_drill_sessions" ON drill_sessions FOR ALL USING (is_staff_member());
CREATE POLICY "approved_read_drill_sessions" ON drill_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND approved = true)
);

-- drill_attendance: staff manage, cadets read own
CREATE POLICY "staff_manage_drill_attendance" ON drill_attendance FOR ALL USING (is_staff_member());
CREATE POLICY "cadets_read_own_drill_attendance" ON drill_attendance FOR SELECT USING (
  cadet_id = current_profile_id()
);

-- drill_visitors: staff only
CREATE POLICY "staff_manage_visitors" ON drill_visitors FOR ALL USING (is_staff_member());

-- tsw_calendar: staff manage, all approved read
CREATE POLICY "staff_manage_tsw" ON tsw_calendar FOR ALL USING (is_staff_member());
CREATE POLICY "approved_read_tsw" ON tsw_calendar FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND approved = true)
);

-- qualifications: staff manage, cadets read own
CREATE POLICY "staff_manage_quals" ON qualifications FOR ALL USING (is_staff_member());
CREATE POLICY "cadets_read_own_quals" ON qualifications FOR SELECT USING (
  cadet_id = current_profile_id()
);

-- billet_nominations: staff manage, cadets read own
CREATE POLICY "staff_manage_nominations" ON billet_nominations FOR ALL USING (is_staff_member());
CREATE POLICY "cadets_read_own_nominations" ON billet_nominations FOR SELECT USING (
  cadet_id = current_profile_id()
);

-- corrections: COMMAND ONLY
CREATE POLICY "command_manage_corrections" ON corrections FOR ALL USING (is_command());
CREATE POLICY "command_manage_corrective_actions" ON corrective_actions FOR ALL USING (is_command());
CREATE POLICY "command_manage_pips" ON pips FOR ALL USING (is_command());
CREATE POLICY "command_manage_pip_corrections" ON pip_corrections FOR ALL USING (is_command());

-- uniform inspections: MAA or command
CREATE POLICY "maa_manage_inspection_sessions" ON uniform_inspection_sessions FOR ALL USING (is_maa_or_command());
CREATE POLICY "maa_manage_inspection_results" ON uniform_inspection_results FOR ALL USING (is_maa_or_command());

-- other_issues: command only
CREATE POLICY "command_manage_other_issues" ON other_issues FOR ALL USING (is_command());

-- recruiting: staff manage
CREATE POLICY "staff_manage_recruiting" ON recruiting_prospects FOR ALL USING (is_staff_member());

-- activity_ideas: staff manage, all approved read
CREATE POLICY "staff_manage_ideas" ON activity_ideas FOR ALL USING (is_staff_member());
CREATE POLICY "approved_read_ideas" ON activity_ideas FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND approved = true)
);

-- allowed_emails: command only
CREATE POLICY "command_manage_allowed_emails" ON allowed_emails FOR ALL USING (is_command());

-- ============================================================
-- Google OAuth: auto-create profile from allowed_emails list
-- ============================================================

CREATE OR REPLACE FUNCTION handle_google_oauth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  allowed_role text;
BEGIN
  -- Only fires for Google OAuth sign-ins
  IF NEW.raw_app_meta_data->>'provider' <> 'google' THEN
    RETURN NEW;
  END IF;

  SELECT role_grant INTO allowed_role FROM allowed_emails WHERE email = NEW.email;

  IF allowed_role IS NOT NULL THEN
    INSERT INTO profiles (user_id, full_name, email, role, approved, active)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.email,
      allowed_role,
      true,
      true
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_google_oauth_user ON auth.users;
CREATE TRIGGER on_google_oauth_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_google_oauth_user();

-- ============================================================
-- Computed seniority view (billet rank order)
-- ============================================================

CREATE OR REPLACE FUNCTION billet_seniority(billet_name text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE billet_name
    WHEN 'Commanding Officer' THEN 1
    WHEN 'Executive Officer' THEN 2
    WHEN 'Operations Officer' THEN 3
    WHEN 'Command Chief' THEN 4
    WHEN 'Alpha Division Commander' THEN 5
    WHEN 'Bravo Division Commander' THEN 6
    WHEN 'Delta Division Commander' THEN 7
    WHEN 'Echo Division Commander' THEN 8
    WHEN 'Alpha Division Petty Officer' THEN 9
    WHEN 'Bravo Division Petty Officer' THEN 10
    WHEN 'Delta Division Petty Officer' THEN 11
    WHEN 'Echo Division Petty Officer' THEN 12
    WHEN 'Assistant Alpha Division Petty Officer' THEN 13
    WHEN 'Assistant Bravo Division Petty Officer' THEN 14
    WHEN 'Assistant Delta Division Petty Officer' THEN 15
    WHEN 'Assistant Echo Division Petty Officer' THEN 16
    WHEN 'Master-at-Arms' THEN 17
    WHEN 'Assistant Master-at-Arms' THEN 18
    WHEN 'Yeoman' THEN 19
    WHEN 'Logistics Petty Officer' THEN 20
    WHEN 'Historian' THEN 21
    WHEN 'Public Affairs Petty Officer' THEN 22
    WHEN 'Recruiting Petty Officer' THEN 23
    WHEN 'DPO' THEN 24
    ELSE 99
  END;
$$;

-- Seniority view for the org chart / roster
CREATE OR REPLACE VIEW profile_seniority AS
SELECT
  p.*,
  LEAST(
    billet_seniority(p.billet),
    billet_seniority(p.billet_2),
    billet_seniority(p.billet_3)
  ) AS computed_seniority
FROM profiles p;
