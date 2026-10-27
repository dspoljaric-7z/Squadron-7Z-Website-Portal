-- Absence requests table
CREATE TABLE IF NOT EXISTS absence_requests (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cadet_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_date DATE        NOT NULL,
  reason         TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by    UUID        REFERENCES profiles(id),
  reviewed_at    TIMESTAMPTZ,
  review_notes   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE absence_requests ENABLE ROW LEVEL SECURITY;

-- Cadets can see and insert their own requests
CREATE POLICY "cadets view own absence requests"
  ON absence_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = absence_requests.cadet_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "cadets insert own absence requests"
  ON absence_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = cadet_id
        AND profiles.user_id = auth.uid()
    )
  );

-- Staff can view all requests
CREATE POLICY "staff view all absence requests"
  ON absence_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND role IN ('officer', 'snco', 'nco')
    )
  );

-- Senior staff can update (approve / deny)
CREATE POLICY "senior staff update absence requests"
  ON absence_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND role IN ('officer', 'snco')
    )
  );
