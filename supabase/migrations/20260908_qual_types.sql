-- Create qual_types table to allow DB-driven qualification type management
CREATE TABLE IF NOT EXISTS qual_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO qual_types (name, sort_order) VALUES
  ('First Aid / CPR', 1),
  ('Watch Standing', 2),
  ('Color Guard', 3),
  ('Marksmanship', 4),
  ('DPO Qualification', 5),
  ('PO1 Board', 6),
  ('Practice CPO Board', 7)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE qual_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read qual_types"
  ON qual_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "Officers can manage qual_types"
  ON qual_types FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'officer'));
