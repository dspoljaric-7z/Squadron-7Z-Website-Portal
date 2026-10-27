-- Delete stale public_faqs rows that override correct hardcoded fallbacks
-- These rows say "Membership is free" and cause incorrect info to show publicly.
-- Run manually in Supabase dashboard → SQL editor for project yetrzecfdckzmnqwrffm

DELETE FROM public.public_faqs
WHERE answer ILIKE '%free%'
   OR question ILIKE '%cost%'
   OR question ILIKE '%free%';

-- After running, verify no stale rows remain:
-- SELECT id, question, answer FROM public.public_faqs ORDER BY id;
