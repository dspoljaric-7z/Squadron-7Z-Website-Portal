-- ═══════════════════════════════════════════════════════════════════════════
-- SQ7Z Org Chart Hierarchy Fix — 2026-10-27
-- Run in Supabase SQL Editor (Settings → SQL Editor)
-- SAFE to run multiple times (idempotent)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── STEP 0: Preview what's in the billets table first ───────────────────────
-- (Uncomment this block, run it, confirm names match, then run the rest)
-- SELECT id, name, org_section, parent_billet_id, sort_order
--   FROM billets WHERE active = true ORDER BY sort_order;

-- ── STEP 1: Officer billets — make sure CO/XO/staff are org_section='officer'
-- These should NOT appear in the ops chart
UPDATE billets SET org_section = 'officer', parent_billet_id = NULL
WHERE name IN (
  'Commanding Officer', 'Executive Officer',
  'Supply Petty Officer', 'Admin Petty Officer', 'Training Petty Officer',
  'Public Affairs Officer', 'Finance Officer', 'Administrative Officer',
  'Chaplain', 'Legal Officer', 'Health Services Officer'
)
AND active = true;

-- ── STEP 2: Ops PO = cadet root (top of ops chain, no parent)
UPDATE billets
SET parent_billet_id = NULL,
    org_section      = 'cadet',
    sort_order       = 10
WHERE name ILIKE '%Operations Petty Officer%' AND active = true;

-- ── STEP 3: ALPO Sea Cadets → reports to Ops PO
UPDATE billets
SET parent_billet_id = (
      SELECT id FROM billets WHERE name ILIKE '%Operations Petty Officer%' AND active = true LIMIT 1
    ),
    org_section = 'cadet',
    sort_order  = 20
WHERE name ILIKE '%ALPO%Sea%' AND active = true;

-- ── STEP 4: ALPO Lead Cadets → reports to Ops PO (rename SLPO → ALPO Lead Cadets)
UPDATE billets
SET parent_billet_id = (
      SELECT id FROM billets WHERE name ILIKE '%Operations Petty Officer%' AND active = true LIMIT 1
    ),
    org_section = 'cadet',
    name        = 'ALPO — Lead Cadets',
    sort_order  = 30
WHERE (name ILIKE '%SLPO%' OR name ILIKE '%ALPO%Lead%' OR name ILIKE '%ALPO%League%')
  AND active = true;

-- ── STEP 5: Alpha, Bravo, X-Ray DPOs → report to ALPO Sea Cadets
UPDATE billets
SET parent_billet_id = (
      SELECT id FROM billets WHERE name ILIKE '%ALPO%Sea%' AND active = true LIMIT 1
    ),
    org_section = 'cadet'
WHERE name ILIKE '%Alpha%DPO%' AND active = true;

UPDATE billets
SET parent_billet_id = (
      SELECT id FROM billets WHERE name ILIKE '%ALPO%Sea%' AND active = true LIMIT 1
    ),
    org_section = 'cadet'
WHERE name ILIKE '%Bravo%DPO%' AND active = true;

UPDATE billets
SET parent_billet_id = (
      SELECT id FROM billets WHERE name ILIKE '%ALPO%Sea%' AND active = true LIMIT 1
    ),
    org_section = 'cadet'
WHERE name ILIKE '%X-Ray%DPO%' OR (name ILIKE '%X Ray%DPO%' AND active = true);

-- ── STEP 6: Delta, Echo DPOs → report to ALPO Lead Cadets
UPDATE billets
SET parent_billet_id = (
      SELECT id FROM billets
      WHERE (name ILIKE '%ALPO%Lead%' OR name ILIKE '%ALPO%League%' OR name ILIKE '%SLPO%')
        AND active = true LIMIT 1
    ),
    org_section = 'cadet'
WHERE name ILIKE '%Delta%DPO%' AND active = true;

UPDATE billets
SET parent_billet_id = (
      SELECT id FROM billets
      WHERE (name ILIKE '%ALPO%Lead%' OR name ILIKE '%ALPO%League%' OR name ILIKE '%SLPO%')
        AND active = true LIMIT 1
    ),
    org_section = 'cadet'
WHERE name ILIKE '%Echo%DPO%' AND active = true;

-- ── STEP 7: Alpha ADPO → Alpha DPO
UPDATE billets
SET parent_billet_id = (
      SELECT id FROM billets WHERE name ILIKE '%Alpha%DPO%' AND active = true LIMIT 1
    ),
    org_section = 'cadet'
WHERE name ILIKE '%Alpha%ADPO%' AND active = true;

-- ── STEP 8: Bravo ADPO → Bravo DPO
UPDATE billets
SET parent_billet_id = (
      SELECT id FROM billets WHERE name ILIKE '%Bravo%DPO%' AND active = true LIMIT 1
    ),
    org_section = 'cadet'
WHERE name ILIKE '%Bravo%ADPO%' AND active = true;

-- ── STEP 9: Delta ADPO → Delta DPO
UPDATE billets
SET parent_billet_id = (
      SELECT id FROM billets WHERE name ILIKE '%Delta%DPO%' AND active = true LIMIT 1
    ),
    org_section = 'cadet'
WHERE name ILIKE '%Delta%ADPO%' AND active = true;

-- ── STEP 10: Echo ADPO → Echo DPO
UPDATE billets
SET parent_billet_id = (
      SELECT id FROM billets WHERE name ILIKE '%Echo%DPO%' AND active = true LIMIT 1
    ),
    org_section = 'cadet'
WHERE name ILIKE '%Echo%ADPO%' AND active = true;

-- ── STEP 11: Command MAA = MAA root (reports visually to LPO, shown at bottom of ops chart)
UPDATE billets
SET parent_billet_id = NULL,
    org_section      = 'maa',
    sort_order       = 100
WHERE name ILIKE '%Command MAA%' AND active = true;

-- ── STEP 12: Master-at-Arms → Command MAA
UPDATE billets
SET parent_billet_id = (
      SELECT id FROM billets WHERE name ILIKE '%Command MAA%' AND active = true LIMIT 1
    ),
    org_section = 'maa'
WHERE (name ILIKE '%Master-at-Arms%' OR name ILIKE '%MAA%')
  AND name NOT ILIKE '%Command%'
  AND name NOT ILIKE '%Asst%'
  AND name NOT ILIKE '%Assistant%'
  AND active = true;

-- ── STEP 13: Assistant/AMAA → Master-at-Arms
UPDATE billets
SET parent_billet_id = (
      SELECT id FROM billets
      WHERE (name ILIKE '%Master-at-Arms%' OR name ILIKE '%MAA%')
        AND name NOT ILIKE '%Command%'
        AND name NOT ILIKE '%Asst%'
        AND name NOT ILIKE '%Assistant%'
        AND active = true
      LIMIT 1
    ),
    org_section = 'maa'
WHERE (name ILIKE '%Asst%MAA%' OR name ILIKE '%Assistant%MAA%' OR name ILIKE '%AMAA%')
  AND active = true;

-- ── STEP 14: Any remaining cadet billets with no parent → set parent to Ops PO
-- (catches any stragglers like extra billets not explicitly listed above)
UPDATE billets
SET parent_billet_id = (
      SELECT id FROM billets WHERE name ILIKE '%Operations Petty Officer%' AND active = true LIMIT 1
    )
WHERE org_section = 'cadet'
  AND parent_billet_id IS NULL
  AND name NOT ILIKE '%Operations Petty Officer%'
  AND active = true;

-- ── VERIFY: See the result ───────────────────────────────────────────────────
SELECT
  b.name,
  b.org_section,
  b.sort_order,
  p.name AS parent_name,
  b.assigned_to IS NOT NULL AS filled
FROM billets b
LEFT JOIN billets p ON p.id = b.parent_billet_id
WHERE b.active = true
ORDER BY b.org_section, b.sort_order;
