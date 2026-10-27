-- POD: approval workflow + richer information fields
-- Run manually in Supabase dashboard → SQL editor for project yetrzecfdckzmnqwrffm

ALTER TABLE public.plan_of_day
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS training_objective text,
  ADD COLUMN IF NOT EXISTS officer_in_charge_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS officer_in_charge_name text,
  ADD COLUMN IF NOT EXISTS special_events text,
  ADD COLUMN IF NOT EXISTS safety_brief text,
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by_name text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_notes text;

-- Existing PODs default to 'draft'
UPDATE public.plan_of_day SET status = 'draft' WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS plan_of_day_status_idx ON public.plan_of_day(status);
