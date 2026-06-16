-- ============================================================
-- SQ7Z Portal — Setup SQL
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Add Senior NCO role to enum (safe if already exists)
DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE 'snco' AFTER 'nco';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Divisions
CREATE TABLE IF NOT EXISTS public.divisions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  color text DEFAULT '#003087',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES public.divisions(id) ON DELETE SET NULL;

ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view divisions" ON public.divisions;
DROP POLICY IF EXISTS "Senior staff can manage divisions" ON public.divisions;

CREATE POLICY "Authenticated can view divisions" ON public.divisions
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Senior staff can manage divisions" ON public.divisions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('officer','snco'))
  );

-- Plan of the Day
CREATE TABLE IF NOT EXISTS public.plan_of_day (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL UNIQUE,
  uniform_of_day text,
  watch_bill text,
  items jsonb DEFAULT '[]'::jsonb,
  notes text DEFAULT '',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- If table already exists, add new columns
ALTER TABLE public.plan_of_day ADD COLUMN IF NOT EXISTS uniform_of_day text;
ALTER TABLE public.plan_of_day ADD COLUMN IF NOT EXISTS watch_bill text;

-- POD Templates
CREATE TABLE IF NOT EXISTS public.pod_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  items jsonb DEFAULT '[]'::jsonb,
  uniform_of_day text,
  watch_bill text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Billets
CREATE TABLE IF NOT EXISTS public.billets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  duties text DEFAULT '',
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  sort_order int DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plan_of_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pod_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billets ENABLE ROW LEVEL SECURITY;

-- POD policies
DROP POLICY IF EXISTS "Authenticated can view POD" ON public.plan_of_day;
DROP POLICY IF EXISTS "Staff can insert POD" ON public.plan_of_day;
DROP POLICY IF EXISTS "Staff can update POD" ON public.plan_of_day;
DROP POLICY IF EXISTS "Officers can delete POD" ON public.plan_of_day;

CREATE POLICY "Authenticated can view POD" ON public.plan_of_day
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can insert POD" ON public.plan_of_day
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('officer','nco'))
  );
CREATE POLICY "Staff can update POD" ON public.plan_of_day
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('officer','nco'))
  );
CREATE POLICY "Officers can delete POD" ON public.plan_of_day
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'officer')
  );

-- POD Template policies
DROP POLICY IF EXISTS "Authenticated can view templates" ON public.pod_templates;
DROP POLICY IF EXISTS "Staff can manage templates" ON public.pod_templates;

CREATE POLICY "Authenticated can view templates" ON public.pod_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can manage templates" ON public.pod_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('officer','nco'))
  );

-- Billet policies
DROP POLICY IF EXISTS "Authenticated can view billets" ON public.billets;
DROP POLICY IF EXISTS "Officers can manage billets" ON public.billets;

CREATE POLICY "Authenticated can view billets" ON public.billets
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Officers can manage billets" ON public.billets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'officer')
  );

-- Seed default billets (skip if already exist)
INSERT INTO public.billets (name, description, duties, sort_order) VALUES
  ('Commanding Officer', 'Responsible for overall command and leadership of the squadron.', E'- Command all squadron evolutions\n- Represent the unit to NSCC leadership\n- Set standards and enforce good order and discipline', 1),
  ('Executive Officer', 'Second in command; handles internal administration and readiness.', E'- Manage daily operations\n- Maintain unit readiness reports\n- Coordinate training schedule', 2),
  ('Supply Petty Officer', 'Manages all unit equipment, uniforms, and materiel.', E'- Track and issue equipment\n- Conduct quarterly inventory\n- Submit supply requests to officers', 3),
  ('Admin Petty Officer', 'Handles correspondence, records, and official paperwork.', E'- Maintain cadet service records\n- Process official correspondence\n- Track qualification certificates', 4),
  ('Training Petty Officer', 'Plans and coordinates training evolutions.', E'- Draft training schedules\n- Source training materials\n- Track individual qualifications', 5),
  ('Master-at-Arms', 'Enforces good order and discipline within the unit.', E'- Conduct musters\n- Report discrepancies to chain of command\n- Enforce uniform standards', 6)
ON CONFLICT DO NOTHING;

-- Update is_staff() to include snco
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT coalesce((SELECT role IN ('officer','snco','nco') FROM public.profiles WHERE user_id = auth.uid()), false);
$$;

-- Update is_officer() to remain officer-only (no change needed, but restate for clarity)
CREATE OR REPLACE FUNCTION public.is_officer()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT coalesce((SELECT role = 'officer' FROM public.profiles WHERE user_id = auth.uid()), false);
$$;

-- Helper: is senior staff (officer or snco)
CREATE OR REPLACE FUNCTION public.is_senior_staff()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT coalesce((SELECT role IN ('officer','snco') FROM public.profiles WHERE user_id = auth.uid()), false);
$$;

GRANT EXECUTE ON FUNCTION public.is_senior_staff() TO anon, authenticated;

-- Update billets policy to allow snco
DROP POLICY IF EXISTS "Officers can manage billets" ON public.billets;
CREATE POLICY "Senior staff can manage billets" ON public.billets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('officer','snco'))
  );

-- Update POD insert/update policies to snco only (not nco)
DROP POLICY IF EXISTS "Staff can insert POD" ON public.plan_of_day;
DROP POLICY IF EXISTS "Staff can update POD" ON public.plan_of_day;
CREATE POLICY "Senior staff can insert POD" ON public.plan_of_day
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('officer','snco'))
  );
CREATE POLICY "Senior staff can update POD" ON public.plan_of_day
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('officer','snco'))
  );

-- Update POD template policy to snco only
DROP POLICY IF EXISTS "Staff can manage templates" ON public.pod_templates;
CREATE POLICY "Senior staff can manage templates" ON public.pod_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('officer','snco'))
  );
