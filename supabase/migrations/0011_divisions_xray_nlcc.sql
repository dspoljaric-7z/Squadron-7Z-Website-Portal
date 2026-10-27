-- Create Division Xray (NSCC Recruit Cadets) and Division Foxtrot/NLCC RC
-- Run manually in Supabase dashboard → SQL editor for project yetrzecfdckzmnqwrffm

-- ── Step 1: Create the two new divisions ──────────────────────────────────────

INSERT INTO public.divisions (name, description, color)
VALUES
  ('Xray', 'NSCC Recruit Cadets — entry-level NSCC program track', '#003087'),
  ('NLCC', 'Navy League Cadet Corps — NLCC Recruit Cadet program track', '#B8860B')
ON CONFLICT DO NOTHING;

-- ── Step 2: Assign all NSCC RC-rank cadets to Division Xray ──────────────────
-- Replace 'RC' below with the exact rank string used in your profiles table.
-- Run this first, then adjust via the portal if any cadets need to be moved out.

UPDATE public.profiles
SET division_id = (SELECT id FROM public.divisions WHERE name = 'Xray' LIMIT 1)
WHERE rank = 'RC'
  AND role = 'cadet'
  AND active = true;

-- ── Step 3: Put PO2 Lincoln Renaud in charge of Division Xray ────────────────
-- Sets his billet to "Division PO, Xray" and assigns him to Xray.
-- If his rank is stored differently (e.g. 'PO2' vs 'Petty Officer 2nd Class')
-- adjust the WHERE clause accordingly.

UPDATE public.profiles
SET
  division_id = (SELECT id FROM public.divisions WHERE name = 'Xray' LIMIT 1),
  billet = 'Division PO, Xray'
WHERE full_name ILIKE '%Renaud%'
  AND rank = 'PO2'
  AND active = true;

-- ── Step 4: Assign NLCC RC cadets to the NLCC division ───────────────────────
-- This assumes NLCC cadets have a role or rank that distinguishes them.
-- Adjust the WHERE clause to match your actual data.
-- Option A: if NLCC cadets have a separate billet or note in their profile
-- (uncomment and adjust as needed after checking your data):
--
-- UPDATE public.profiles
-- SET division_id = (SELECT id FROM public.divisions WHERE name = 'NLCC' LIMIT 1)
-- WHERE rank = 'RC'
--   AND role = 'cadet'
--   AND active = true
--   AND <your condition to identify NLCC vs NSCC RCs>;

-- ── Verification queries ──────────────────────────────────────────────────────

-- Check the new divisions exist:
-- SELECT id, name, description, color FROM public.divisions ORDER BY name;

-- Check Xray assignment:
-- SELECT full_name, rank, billet FROM public.profiles
-- WHERE division_id = (SELECT id FROM public.divisions WHERE name = 'Xray' LIMIT 1)
-- ORDER BY full_name;

-- Check Renaud:
-- SELECT full_name, rank, billet, division_id FROM public.profiles
-- WHERE full_name ILIKE '%Renaud%';
