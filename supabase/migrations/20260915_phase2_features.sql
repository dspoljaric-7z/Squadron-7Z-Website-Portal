-- Phase 2 Features Migration
-- Run this in the Supabase SQL editor for project yetrzecfdckzmnqwrffm

-- ============================================================
-- 1. Event RSVPs
-- ============================================================
CREATE TABLE IF NOT EXISTS event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'not_attending', 'maybe')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, profile_id)
);

ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rsvps_select" ON event_rsvps FOR SELECT
  USING (
    profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('officer','snco','nco') LIMIT 1)
  );

CREATE POLICY "rsvps_insert" ON event_rsvps FOR INSERT
  WITH CHECK (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "rsvps_update" ON event_rsvps FOR UPDATE
  USING (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1))
  WITH CHECK (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "rsvps_delete" ON event_rsvps FOR DELETE
  USING (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1));

-- Add rsvp_required flag to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS rsvp_required boolean NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS rsvp_deadline timestamptz;

-- ============================================================
-- 2. Notification / Email Templates
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  title_template text NOT NULL,
  body_template text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_templates_select" ON notification_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "notif_templates_write" ON notification_templates FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'officer' LIMIT 1))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'officer' LIMIT 1));

-- Seed default templates
INSERT INTO notification_templates (key, label, description, title_template, body_template) VALUES
  ('account_deactivated', 'Account Deactivated', 'Sent to a cadet when their portal access is suspended.', 'Account Deactivated', 'Your portal access has been suspended by {staff_name}. Contact your chain of command if you believe this is in error.'),
  ('nomination_approved', 'Nomination Approved', 'Sent to a cadet when confirmed for a billet.', 'Nomination Confirmed — {billet_name}', 'Congratulations! You have been confirmed for {billet_name}.'),
  ('nomination_not_selected', 'Nomination Not Selected', 'Sent when a cadet is not selected.', 'Nomination Update — {billet_name}', 'Your nomination for {billet_name} was not selected. {reason}'),
  ('nomination_update', 'Nomination Stage Update', 'Sent on intermediate nomination stage changes.', 'Nomination Update — {billet_name}', 'Your nomination for {billet_name} has been updated to: {stage}.'),
  ('qual_complete', 'Qualifications Complete', 'Sent to a cadet when they finish all qualifications.', 'All Qualifications Complete!', 'Congratulations {cadet_name}! You have completed all required qualifications.'),
  ('pip_opened', 'PIP Opened', 'Sent to a cadet when a PIP is issued against them.', 'Performance Improvement Plan Issued', 'A Performance Improvement Plan has been issued by {staff_name}. Please review the requirements and check in with your supervisor.'),
  ('pip_acknowledged', 'PIP Acknowledged', 'Sent to staff when a cadet acknowledges a PIP.', 'PIP Acknowledged by {cadet_name}', '{cadet_name} has acknowledged their Performance Improvement Plan.'),
  ('correction_issued', 'Correction Issued', 'Sent when a correction is recorded against a cadet.', 'Correction Issued — Tier {tier}', 'A Tier {tier} correction has been issued by {staff_name}: {description}')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 3. Nomination Rubric Categories
-- ============================================================
CREATE TABLE IF NOT EXISTS nomination_rubric_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  max_score int NOT NULL DEFAULT 10,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nomination_rubric_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rubric_cats_select" ON nomination_rubric_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "rubric_cats_write" ON nomination_rubric_categories FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('officer','snco') LIMIT 1))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('officer','snco') LIMIT 1));

-- Seed default rubric categories (replaces hardcoded 6)
INSERT INTO nomination_rubric_categories (name, description, max_score, sort_order) VALUES
  ('Leadership', 'Demonstrates initiative, motivates peers, sets example for others', 10, 1),
  ('Character', 'Integrity, honesty, accountability, adherence to core values', 10, 2),
  ('Technical Knowledge', 'Proficiency in required skills, certifications, and qualifications', 10, 3),
  ('Military Bearing', 'Uniform, grooming, bearing, and overall professional presentation', 10, 4),
  ('Teamwork', 'Cooperates with peers, subordinates, and supervisors effectively', 10, 5),
  ('Physical Fitness', 'Maintains required physical standards and fitness levels', 10, 6)
ON CONFLICT DO NOTHING;

-- Add category_id to nomination_evals scores (dynamic)
CREATE TABLE IF NOT EXISTS nomination_eval_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomination_id uuid NOT NULL REFERENCES billet_nominations(id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES nomination_rubric_categories(id) ON DELETE CASCADE,
  score int NOT NULL CHECK (score >= 0 AND score <= 10),
  comments text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(nomination_id, evaluator_id, category_id)
);

ALTER TABLE nomination_eval_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eval_scores_select" ON nomination_eval_scores FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('officer','snco') LIMIT 1));
CREATE POLICY "eval_scores_write" ON nomination_eval_scores FOR ALL
  USING (evaluator_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1))
  WITH CHECK (evaluator_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1));

-- ============================================================
-- 4. PIP / Correction Close-out Columns
-- ============================================================
ALTER TABLE pips ADD COLUMN IF NOT EXISTS cadet_acknowledged_at timestamptz;
ALTER TABLE pips ADD COLUMN IF NOT EXISTS closed_at timestamptz;
ALTER TABLE pips ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES profiles(id);
ALTER TABLE pips ADD COLUMN IF NOT EXISTS closed_by_notes text;

ALTER TABLE corrections ADD COLUMN IF NOT EXISTS cadet_acknowledged_at timestamptz;
ALTER TABLE corrections ADD COLUMN IF NOT EXISTS closed_by_notes text;

-- ============================================================
-- 5. POD Templates (if not already existing)
-- ============================================================
CREATE TABLE IF NOT EXISTS pod_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pod_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pod_templates_select" ON pod_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "pod_templates_write" ON pod_templates FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('officer','snco') LIMIT 1))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('officer','snco') LIMIT 1));

-- ============================================================
-- 6. Recurring Drill — no new table needed, handled in app
-- ============================================================

-- ============================================================
-- 7. Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_profile_id ON event_rsvps(profile_id);
CREATE INDEX IF NOT EXISTS idx_notif_templates_key ON notification_templates(key);
CREATE INDEX IF NOT EXISTS idx_rubric_cats_sort ON nomination_rubric_categories(sort_order) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_eval_scores_nomination ON nomination_eval_scores(nomination_id);
