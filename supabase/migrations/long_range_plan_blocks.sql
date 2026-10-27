-- Long-Range Plan blocks (phase training + drill events)
-- Run this in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/yetrzecfdckzmnqwrffm/sql

CREATE TABLE IF NOT EXISTS long_range_plan_blocks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     uuid        NOT NULL REFERENCES long_range_plan(id) ON DELETE CASCADE,
  -- phase blocks: 1/2/3 — NULL for event-type rows
  phase       smallint    CHECK (phase IN (1, 2, 3)),
  -- 'phase' = training topic; 'major_event'/'minor_event'/'prt'/'custom' = drill events
  block_type  text        NOT NULL DEFAULT 'phase'
                CHECK (block_type IN ('phase','major_event','minor_event','prt','custom')),
  topic       text        NOT NULL,
  sort_order  smallint    DEFAULT 0,
  created_by  uuid        REFERENCES profiles(id),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lrp_blocks_plan_id ON long_range_plan_blocks(plan_id);

ALTER TABLE long_range_plan_blocks ENABLE ROW LEVEL SECURITY;

-- NCOs+ can read
CREATE POLICY "Staff can select blocks"
  ON long_range_plan_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('officer','snco','nco')
    )
  );

-- Officers / SNCOs can write
CREATE POLICY "Officers can manage blocks"
  ON long_range_plan_blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('officer','snco')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('officer','snco')
    )
  );
