-- Board Results table
CREATE TABLE IF NOT EXISTS board_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cadet_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  board_date DATE NOT NULL,
  from_rank TEXT,
  to_rank TEXT,
  result TEXT NOT NULL CHECK (result IN ('recommended', 'not_recommended', 'deferred')),
  notes TEXT,
  posted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE board_results ENABLE ROW LEVEL SECURITY;

-- Staff (nco/snco/officer) can read all
CREATE POLICY "staff_read_board_results" ON board_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('officer','snco','nco')
        AND profiles.approved = true
    )
  );

-- Staff + yeoman billets can insert
CREATE POLICY "staff_insert_board_results" ON board_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.approved = true
        AND (
          profiles.role IN ('officer','snco','nco')
          OR profiles.billet ILIKE '%yeoman%'
          OR profiles.billet_2 ILIKE '%yeoman%'
          OR profiles.billet_3 ILIKE '%yeoman%'
        )
    )
  );

-- Officers and original poster can update
CREATE POLICY "staff_update_board_results" ON board_results
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('officer','snco')
        AND profiles.approved = true
    )
    OR posted_by = auth.uid()
  );

-- Officers only can delete
CREATE POLICY "officer_delete_board_results" ON board_results
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'officer'
        AND profiles.approved = true
    )
  );
