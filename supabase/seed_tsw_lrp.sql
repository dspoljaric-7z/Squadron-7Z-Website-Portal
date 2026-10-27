-- TSW Long-Range Plan seed data (AY 2026-2027 and beyond)
-- Run this in the Supabase SQL Editor for the sq7z project

INSERT INTO tsw_long_range_plans (date, theme, notes, status)
VALUES
  -- Oct 2026
  ('2026-10-25', 'BSU',                         'Boston State University drill',                                  'planned'),
  -- Nov 2026
  ('2026-11-07', 'Castle Island / Volunteering', 'Community service at Castle Island',                            'planned'),
  ('2026-11-11', 'Veteran''s Day Parade',        'Quincy – Veteran''s Day Parade participation',                  'planned'),
  ('2026-11-22', 'NRC – Morse Code',             'Naval Reserve Center: Morse Code training block',              'planned'),
  -- Dec 2026
  ('2026-12-13', 'NRC – Authority vs Influence', 'Naval Reserve Center: Leadership topic',                        'planned'),
  ('2026-12-20', 'NRC – Model UN',               'Naval Reserve Center: Model UN exercise',                      'planned'),
  -- Jan 2027
  ('2027-01-17', 'BSU – Change of Command',      'Boston State University: Change of Command ceremony',          'planned'),
  ('2027-01-24', 'NRC – Inspection Prep',        'Naval Reserve Center: Inspection preparation',                 'planned'),
  -- Feb 2027
  ('2027-02-07', 'BSU – Parents Day',            'Boston State University: Parents Day event',                   'planned'),
  ('2027-02-28', 'NRC – Inspection Prep',        'Naval Reserve Center: Inspection preparation (final)',         'planned'),
  -- Mar 2027
  ('2027-03-14', 'NRC – Inspection',             'Naval Reserve Center: Annual inspection',                      'planned'),
  ('2027-03-28', 'NRC – Practice PRT',           'Naval Reserve Center: Practice Physical Readiness Test',       'planned'),
  -- Apr 2027
  ('2027-04-11', 'NRC – Biannual Training + PRT','Naval Reserve Center: Biannual training and PRT',             'planned'),
  ('2027-04-25', 'USS Salem / BSU',              'USS Salem visit and BSU drill',                                'planned'),
  -- May 2027
  ('2027-05-02', 'USS Salem / BSU',              'USS Salem visit and BSU drill (second date)',                  'planned'),
  ('2027-05-23', 'USS Salem – Graduation',       'USS Salem: Graduation ceremony',                               'planned'),
  ('2027-05-31', 'Quincy – Memorial Day Parade', 'Memorial Day Parade, Quincy',                                  'planned')
ON CONFLICT (date) DO UPDATE
  SET theme  = EXCLUDED.theme,
      notes  = EXCLUDED.notes,
      status = EXCLUDED.status;
