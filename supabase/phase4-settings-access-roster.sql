-- Phase 4: Settings, Document Access, Roster Import
-- Run this in Supabase Dashboard → SQL Editor

-- ─── 1. Watch Bills table (from Phase 3) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS watch_bills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES drill_sessions(id) ON DELETE CASCADE,
  position    TEXT NOT NULL,
  profile_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, position)
);
ALTER TABLE watch_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_view_watchbill" ON watch_bills;
DROP POLICY IF EXISTS "maa_manage_watchbill" ON watch_bills;
CREATE POLICY "staff_view_watchbill" ON watch_bills FOR SELECT USING (is_staff_member());
CREATE POLICY "maa_manage_watchbill" ON watch_bills FOR ALL USING (is_maa_or_command());

-- ─── 2. Profile: preferred_name and contact_phone columns ──────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- ─── 3. Documents: granular access control columns ─────────────────────────────
ALTER TABLE documents ADD COLUMN IF NOT EXISTS access_roles TEXT[];
ALTER TABLE documents ADD COLUMN IF NOT EXISTS access_billets TEXT[];

-- Update RLS on documents to respect access_roles / access_billets
-- (Officers always see all; for others, check access_roles and access_billets)
-- The existing RLS policies remain; filtering is done in application layer.

-- ─── 4. Divisions: seed Alpha, Bravo, Delta, Echo ──────────────────────────────
-- Only insert if divisions table exists and rows don't already exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'divisions') THEN
    INSERT INTO divisions (name, description) VALUES
      ('Alpha',           'SQ7Z Alpha Division'),
      ('Bravo',           'SQ7Z Bravo Division'),
      ('Delta',           'TSW Delta Division'),
      ('Echo',            'TSW Echo Division'),
      ('Unit Leadership', 'Unit Leadership cadets')
    ON CONFLICT (name) DO NOTHING;
  END IF;
END $$;

-- ─── 5. Roster import ─────────────────────────────────────────────────────────
-- This updates profiles that already exist in the system by matching on full_name.
-- For cadets who haven't registered yet, this is a no-op.
-- After running, manually create invite codes and send them to each cadet.
--
-- NOTE: profile records require an auth.users account (enforced by FK).
-- Cadets without accounts can't be inserted here. Use the Email Invite tab
-- in Admin to send them signup links, then run the UPDATE below once they're in.

-- Update existing profiles with roster data
UPDATE profiles SET rank = 'RC'   WHERE full_name ILIKE '%Barnum%';
UPDATE profiles SET rank = 'SA', division_id = (SELECT id FROM divisions WHERE name='Bravo' LIMIT 1), billet = 'Supply' WHERE full_name ILIKE '%Bertolina%' AND full_name ILIKE '%Otto%';
UPDATE profiles SET rank = 'PO3', division_id = (SELECT id FROM divisions WHERE name='Delta' LIMIT 1), billet = 'Color Guard Captain' WHERE full_name ILIKE '%Bertolina%' AND full_name ILIKE '%Ava%';
UPDATE profiles SET rank = 'SN',  division_id = (SELECT id FROM divisions WHERE name='Bravo' LIMIT 1), billet = 'Corpsman'             WHERE full_name ILIKE '%Blair%';
UPDATE profiles SET rank = 'PO1', division_id = (SELECT id FROM divisions WHERE name='Bravo' LIMIT 1), billet = 'DPO'                  WHERE full_name ILIKE '%Cassidy%';
UPDATE profiles SET rank = 'SN',  division_id = (SELECT id FROM divisions WHERE name='Alpha' LIMIT 1), billet = 'PT'                   WHERE full_name ILIKE '%Cawley%';
UPDATE profiles SET rank = 'SR',  division_id = (SELECT id FROM divisions WHERE name='Alpha' LIMIT 1)                                  WHERE full_name ILIKE '%Danner%';
UPDATE profiles SET rank = 'SR',  division_id = (SELECT id FROM divisions WHERE name='Alpha' LIMIT 1)                                  WHERE full_name ILIKE '%Ford%' AND full_name ILIKE '%Jack%';
UPDATE profiles SET rank = 'SR',  division_id = (SELECT id FROM divisions WHERE name='Bravo' LIMIT 1)                                  WHERE full_name ILIKE '%Ford%' AND full_name ILIKE '%Edward%';
UPDATE profiles SET rank = 'SA',  division_id = (SELECT id FROM divisions WHERE name='Alpha' LIMIT 1)                                  WHERE full_name ILIKE '%Genereux%';
UPDATE profiles SET rank = 'SA',  division_id = (SELECT id FROM divisions WHERE name='Bravo' LIMIT 1)                                  WHERE full_name ILIKE '%Gladchenko%';
UPDATE profiles SET rank = 'PO3', division_id = (SELECT id FROM divisions WHERE name='Alpha' LIMIT 1), billet = 'ADPO'                 WHERE full_name ILIKE '%Greene%';
UPDATE profiles SET rank = 'SR',  division_id = (SELECT id FROM divisions WHERE name='Bravo' LIMIT 1)                                  WHERE full_name ILIKE '%Humphreys%';
UPDATE profiles SET rank = 'RC',  division_id = (SELECT id FROM divisions WHERE name='Bravo' LIMIT 1)                                  WHERE full_name ILIKE '%Jeannot%';
UPDATE profiles SET rank = 'APC', division_id = (SELECT id FROM divisions WHERE name='Echo' LIMIT 1)                                   WHERE full_name ILIKE '%Jones%' AND full_name ILIKE '%James%';
UPDATE profiles SET rank = 'APC', division_id = (SELECT id FROM divisions WHERE name='Delta' LIMIT 1)                                  WHERE full_name ILIKE '%Kehoe%';
UPDATE profiles SET rank = 'SN',  division_id = (SELECT id FROM divisions WHERE name='Bravo' LIMIT 1), billet = 'Supply'               WHERE full_name ILIKE '%Kosh%';
UPDATE profiles SET rank = 'PO3', division_id = (SELECT id FROM divisions WHERE name='Echo' LIMIT 1),  billet = 'PT'                   WHERE full_name ILIKE '%Kurtz%';
UPDATE profiles SET rank = 'SA',  division_id = (SELECT id FROM divisions WHERE name='Alpha' LIMIT 1), billet = 'MAA', is_maa = true    WHERE full_name ILIKE '%Lee%' AND full_name ILIKE '%Andrew%';
UPDATE profiles SET rank = 'SR',  division_id = (SELECT id FROM divisions WHERE name='Alpha' LIMIT 1)                                  WHERE full_name ILIKE '%MacDonald%';
UPDATE profiles SET rank = 'SR',  division_id = (SELECT id FROM divisions WHERE name='Bravo' LIMIT 1)                                  WHERE full_name ILIKE '%McCarthy%';
UPDATE profiles SET rank = 'PO3', division_id = (SELECT id FROM divisions WHERE name='Bravo' LIMIT 1), billet = 'ADPO'                 WHERE full_name ILIKE '%Meagher%' AND full_name ILIKE '%Hamparsoum%';
UPDATE profiles SET rank = 'RC',  division_id = (SELECT id FROM divisions WHERE name='Echo' LIMIT 1)                                   WHERE full_name ILIKE '%Mohanty%';
UPDATE profiles SET rank = 'PO1', division_id = (SELECT id FROM divisions WHERE name='Unit Leadership' LIMIT 1), billet = 'ALPO — Sea Cadets', role = 'snco' WHERE full_name ILIKE '%Moreno%';
UPDATE profiles SET rank = 'SR',  division_id = (SELECT id FROM divisions WHERE name='Bravo' LIMIT 1)                                  WHERE full_name ILIKE '%Nguyen%';
UPDATE profiles SET rank = 'PO1', division_id = (SELECT id FROM divisions WHERE name='Echo' LIMIT 1),  billet = 'DPO', role = 'snco'   WHERE full_name ILIKE '%Pattinson%';
UPDATE profiles SET rank = 'ABC', division_id = (SELECT id FROM divisions WHERE name='Echo' LIMIT 1),  billet = 'ADPO'                 WHERE full_name ILIKE '%Plew%' AND full_name ILIKE '%Aurora%';
UPDATE profiles SET rank = 'ABC', division_id = (SELECT id FROM divisions WHERE name='Delta' LIMIT 1)                                  WHERE full_name ILIKE '%Plew%' AND full_name ILIKE '%Calvin%';
UPDATE profiles SET rank = 'PO2', division_id = (SELECT id FROM divisions WHERE name='Alpha' LIMIT 1), billet = 'DPO', role = 'nco'    WHERE full_name ILIKE '%Renaud%';
UPDATE profiles SET rank = 'SA',  division_id = (SELECT id FROM divisions WHERE name='Bravo' LIMIT 1), billet = 'PT'                   WHERE full_name ILIKE '%Sanden%';
UPDATE profiles SET rank = 'SA',  division_id = (SELECT id FROM divisions WHERE name='Alpha' LIMIT 1), billet = 'Operations Petty Officer' WHERE full_name ILIKE '%Santiago%';
UPDATE profiles SET rank = 'RC',  division_id = (SELECT id FROM divisions WHERE name='Alpha' LIMIT 1)                                  WHERE full_name ILIKE '%Satish%';
UPDATE profiles SET rank = 'PO3', division_id = (SELECT id FROM divisions WHERE name='Delta' LIMIT 1)                                  WHERE full_name ILIKE '%Sham%';
UPDATE profiles SET rank = 'SN',  division_id = (SELECT id FROM divisions WHERE name='Alpha' LIMIT 1)                                  WHERE full_name ILIKE '%Speck%';
UPDATE profiles SET rank = 'CPO', division_id = (SELECT id FROM divisions WHERE name='Unit Leadership' LIMIT 1), billet = 'LPO', role = 'snco', is_command = true WHERE full_name ILIKE '%Spoljaric%';
UPDATE profiles SET rank = 'SA',  division_id = (SELECT id FROM divisions WHERE name='Bravo' LIMIT 1), billet = 'MAA', is_maa = true    WHERE full_name ILIKE '%Tobin%';
UPDATE profiles SET rank = 'SLPO', division_id = (SELECT id FROM divisions WHERE name='Unit Leadership' LIMIT 1), billet = 'SLPO — League Cadets', role = 'snco' WHERE full_name ILIKE '%Troughton%';
UPDATE profiles SET rank = 'CPO', division_id = (SELECT id FROM divisions WHERE name='Unit Leadership' LIMIT 1), billet = 'Command Chief', role = 'snco', is_command = true WHERE full_name ILIKE '%Vaghela%';
UPDATE profiles SET rank = 'PO2', division_id = (SELECT id FROM divisions WHERE name='Delta' LIMIT 1),  billet = 'DPO', role = 'nco'    WHERE full_name ILIKE '%Vigneshwaran%';
UPDATE profiles SET rank = 'APC', division_id = (SELECT id FROM divisions WHERE name='Echo' LIMIT 1)                                   WHERE full_name ILIKE '%Vu%';
UPDATE profiles SET rank = 'SA',  division_id = (SELECT id FROM divisions WHERE name='Alpha' LIMIT 1), billet = 'Supply'               WHERE full_name ILIKE '%Wang%';
UPDATE profiles SET rank = 'SN',  division_id = (SELECT id FROM divisions WHERE name='Bravo' LIMIT 1)                                  WHERE full_name ILIKE '%Williams%';
UPDATE profiles SET rank = 'RC',  division_id = (SELECT id FROM divisions WHERE name='Delta' LIMIT 1)                                  WHERE full_name ILIKE '%Yordanov%';
UPDATE profiles SET rank = 'SN',  division_id = (SELECT id FROM divisions WHERE name='Alpha' LIMIT 1), billet = 'Yeoman Muster'         WHERE full_name ILIKE '%Zammit%' AND full_name ILIKE '%Sean%';
UPDATE profiles SET rank = 'ABC', division_id = (SELECT id FROM divisions WHERE name='Delta' LIMIT 1), billet = 'PT'                   WHERE full_name ILIKE '%Zammit%' AND full_name ILIKE '%Luke%';
UPDATE profiles SET rank = 'RC',  division_id = (SELECT id FROM divisions WHERE name='Bravo' LIMIT 1)                                  WHERE full_name ILIKE '%Zegunia%';

-- Officers (mark as approved + officer role)
UPDATE profiles SET role = 'officer', rank = 'LTJG', billet = 'CO', is_command = true, approved = true WHERE full_name ILIKE '%Desmarais%' AND full_name ILIKE '%Bill%';
UPDATE profiles SET role = 'officer', rank = 'ENS',  billet = 'XO', is_command = true, approved = true WHERE full_name ILIKE '%Meagher%' AND full_name ILIKE '%Dave%';
