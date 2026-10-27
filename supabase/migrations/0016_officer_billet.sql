-- Add officer_billet field for scoped officer access
-- Run manually in Supabase dashboard → SQL editor for project yetrzecfdckzmnqwrffm

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS officer_billet text;

-- Optional check constraint to enumerate known billets (allows custom values too)
-- Values: co | xo | admin_o | ops_o | pao | recruiting_o | <custom>
