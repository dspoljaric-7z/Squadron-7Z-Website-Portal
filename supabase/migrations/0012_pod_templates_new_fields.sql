-- Add new POD fields to pod_templates table so they save/restore correctly
-- Run manually in Supabase dashboard → SQL editor for project yetrzecfdckzmnqwrffm

ALTER TABLE public.pod_templates
  ADD COLUMN IF NOT EXISTS training_objective text,
  ADD COLUMN IF NOT EXISTS officer_in_charge_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS officer_in_charge_name text,
  ADD COLUMN IF NOT EXISTS special_events text,
  ADD COLUMN IF NOT EXISTS safety_brief text;
