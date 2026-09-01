-- Phase 3: Watch Bill migration

CREATE TABLE IF NOT EXISTS watch_bills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES drill_sessions(id) ON DELETE CASCADE,
  position    TEXT NOT NULL,
  profile_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, position)
);

ALTER TABLE watch_bills ENABLE ROW LEVEL SECURITY;

-- Staff can view all watch bills
CREATE POLICY "staff_view_watchbill" ON watch_bills
  FOR SELECT USING (is_staff_member());

-- MAA or Command can manage watch bills
CREATE POLICY "maa_manage_watchbill" ON watch_bills
  FOR ALL USING (is_maa_or_command());
