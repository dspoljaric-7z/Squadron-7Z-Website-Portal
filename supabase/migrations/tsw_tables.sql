-- TSW (League Cadet) Long-Range Plan & Plan of Day tables
-- Paste into: https://supabase.com/dashboard/project/yetrzecfdckzmnqwrffm/sql

-- ── TSW Long-Range Plan ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tsw_long_range_plans (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date         date NOT NULL,
  theme        text NOT NULL DEFAULT '',
  notes        text NOT NULL DEFAULT '',
  status       text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','confirmed','completed')),
  created_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tsw_lrp_blocks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id      uuid NOT NULL REFERENCES tsw_long_range_plans(id) ON DELETE CASCADE,
  phase        smallint CHECK (phase IN (1,2,3)),  -- L-1, L-2, L-3 (NULL for events)
  block_type   text NOT NULL DEFAULT 'phase' CHECK (block_type IN ('phase','major_event','minor_event','prt','custom')),
  topic        text NOT NULL,
  sort_order   int NOT NULL DEFAULT 0,
  created_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tsw_long_range_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tsw_lrp_blocks ENABLE ROW LEVEL SECURITY;

-- Staff can read
CREATE POLICY "Staff can select tsw_long_range_plans"
  ON tsw_long_range_plans FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('officer','snco','nco')));

-- Officers/SNCOs can insert/update/delete
CREATE POLICY "Officers can modify tsw_long_range_plans"
  ON tsw_long_range_plans FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('officer','snco')));

CREATE POLICY "Staff can select tsw_lrp_blocks"
  ON tsw_lrp_blocks FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('officer','snco','nco')));

CREATE POLICY "Officers can modify tsw_lrp_blocks"
  ON tsw_lrp_blocks FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('officer','snco')));

-- ── TSW Plan of Day ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tsw_plan_of_day (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date         date NOT NULL UNIQUE,
  items        jsonb NOT NULL DEFAULT '[]',
  notes        text NOT NULL DEFAULT '',
  uniform      text NOT NULL DEFAULT '',
  leader       text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tsw_plan_of_day ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can select tsw_plan_of_day"
  ON tsw_plan_of_day FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('officer','snco','nco')));

CREATE POLICY "Officers can modify tsw_plan_of_day"
  ON tsw_plan_of_day FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('officer','snco')));

-- ── TSW Meeting Sessions (for date navigation in TSW POD) ──────────────────────

CREATE TABLE IF NOT EXISTS tsw_meeting_sessions (
  id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date   date NOT NULL UNIQUE,
  notes  text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tsw_meeting_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can select tsw_meeting_sessions"
  ON tsw_meeting_sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('officer','snco','nco')));

CREATE POLICY "Officers can modify tsw_meeting_sessions"
  ON tsw_meeting_sessions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('officer','snco')));
