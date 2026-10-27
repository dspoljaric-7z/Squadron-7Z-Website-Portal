-- ── Nomination evals ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nomination_evals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nomination_id uuid NOT NULL REFERENCES billet_nominations(id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leadership integer CHECK (leadership BETWEEN 1 AND 5),
  character integer CHECK (character BETWEEN 1 AND 5),
  technical_knowledge integer CHECK (technical_knowledge BETWEEN 1 AND 5),
  military_bearing integer CHECK (military_bearing BETWEEN 1 AND 5),
  teamwork integer CHECK (teamwork BETWEEN 1 AND 5),
  physical_fitness integer CHECK (physical_fitness BETWEEN 1 AND 5),
  comments text,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(nomination_id, evaluator_id)
);

ALTER TABLE nomination_evals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "command can read evals"
  ON nomination_evals FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('officer', 'snco')
  ));

CREATE POLICY "command can write evals"
  ON nomination_evals FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('officer', 'snco')
  ));

-- ── Nomination stage history ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nomination_stage_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nomination_id uuid NOT NULL REFERENCES billet_nominations(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  changed_by_display text,
  changed_at timestamptz DEFAULT now(),
  reason text
);

ALTER TABLE nomination_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "command can read stage history"
  ON nomination_stage_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('officer', 'snco', 'nco')
  ));

CREATE POLICY "command can insert stage history"
  ON nomination_stage_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('officer', 'snco', 'nco')
  ));

-- ── Board members on nominations ─────────────────────────────────────────────
ALTER TABLE billet_nominations
  ADD COLUMN IF NOT EXISTS board_member_ids uuid[] DEFAULT '{}';

-- ── Document submission pending state ────────────────────────────────────────
ALTER TABLE document_submissions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'collected';
-- values: 'collected' | 'pending' (cadet self-reported, awaiting staff confirmation)

-- ── Qual type prerequisites ──────────────────────────────────────────────────
ALTER TABLE qual_types
  ADD COLUMN IF NOT EXISTS prerequisites text[] DEFAULT '{}';
-- stores array of qual_type *names* that must be 'completed' first

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_nom_evals_nomination    ON nomination_evals(nomination_id);
CREATE INDEX IF NOT EXISTS idx_nom_history_nomination  ON nomination_stage_history(nomination_id);
CREATE INDEX IF NOT EXISTS idx_doc_submissions_cadet2  ON document_submissions(cadet_id, status);
