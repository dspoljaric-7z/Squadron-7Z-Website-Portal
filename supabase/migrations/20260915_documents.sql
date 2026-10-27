-- Document types: defines required documents (waivers, forms, etc.)
CREATE TABLE IF NOT EXISTS document_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  frequency text NOT NULL DEFAULT 'one_time', -- 'one_time' | 'annual' | 'per_event'
  required boolean DEFAULT true,
  active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read document_types"
  ON document_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "snco_plus can manage document_types"
  ON document_types FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('officer', 'snco')
    )
  );

-- Document submissions: tracks per-cadet collection
CREATE TABLE IF NOT EXISTS document_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cadet_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_type_id uuid NOT NULL REFERENCES document_types(id) ON DELETE CASCADE,
  collected_at date NOT NULL DEFAULT CURRENT_DATE,
  collected_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  expiry_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE document_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cadets can read own doc submissions"
  ON document_submissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = cadet_id
        AND profiles.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('officer', 'snco', 'nco')
    )
  );

CREATE POLICY "staff can manage doc submissions"
  ON document_submissions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('officer', 'snco', 'nco')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_doc_submissions_cadet ON document_submissions(cadet_id);
CREATE INDEX IF NOT EXISTS idx_doc_submissions_type ON document_submissions(document_type_id);

-- Seed some common document types
INSERT INTO document_types (name, description, frequency, required, sort_order) VALUES
  ('Medical Consent Form', 'Parent/guardian medical consent and emergency contact', 'annual', true, 10),
  ('Liability Waiver', 'General liability waiver for unit activities', 'annual', true, 20),
  ('Photo Release', 'Permission to use cadet photos in unit materials', 'one_time', false, 30),
  ('Emergency Contact Card', 'Up-to-date emergency contact information', 'annual', true, 40),
  ('Equipment Accountability Form', 'Acknowledgment of issued uniform/equipment', 'one_time', true, 50)
ON CONFLICT DO NOTHING;
