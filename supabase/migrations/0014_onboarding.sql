-- Onboarding checklist for new cadets
-- Run manually in Supabase dashboard → SQL editor for project yetrzecfdckzmnqwrffm

CREATE TABLE IF NOT EXISTS public.onboarding_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  required boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cadet_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadet_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.onboarding_steps(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cadet_id, step_id)
);

-- RLS
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadet_onboarding ENABLE ROW LEVEL SECURITY;

-- Steps: readable by all authenticated members
CREATE POLICY "onboarding_steps_select" ON public.onboarding_steps
  FOR SELECT TO authenticated USING (true);

-- Steps: only officers/snco can insert/update
CREATE POLICY "onboarding_steps_write" ON public.onboarding_steps
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('officer','snco') AND approved = true)
  );

-- Cadet onboarding: cadets can read their own; staff can read all
CREATE POLICY "cadet_onboarding_select" ON public.cadet_onboarding
  FOR SELECT TO authenticated
  USING (
    cadet_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('officer','snco','nco') AND approved = true)
  );

-- Only staff can insert/update progress
CREATE POLICY "cadet_onboarding_write" ON public.cadet_onboarding
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('officer','snco','nco') AND approved = true)
  );

-- Seed default onboarding steps
INSERT INTO public.onboarding_steps (title, description, sort_order, required) VALUES
  ('Complete your profile',         'Add a profile photo and ensure your name, rank, and contact details are up to date.',  1, true),
  ('Submit enrollment paperwork',   'Turn in all required NSCC/NLCC enrollment forms to your chain of command.',             2, true),
  ('Obtain your uniform',           'Order or receive your NWU Type III (blueberries) and any required accessories.',        3, true),
  ('Learn your chain of command',   'Know the names and billets of your Division PO, LCPO, and Commanding Officer.',         4, true),
  ('Attend first drill',            'Successfully attend your first official drill day and be marked present.',              5, true),
  ('Complete BRM / initial quals',  'Complete the Basic Recruit Module or equivalent initial qualification requirement.',    6, false),
  ('Obtain ID card / member card',  'Receive your NSCC or NLCC member identification card from your chain of command.',     7, false)
ON CONFLICT DO NOTHING;
