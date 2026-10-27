-- ================================================================
-- Sea Cadet Portal — Policy Sweep & Documents Storage Fix
-- Applied: 2026-10-26
-- Previous session record: 20261026_security_hardening.sql (freebuff workspace)
--
-- Run in Supabase dashboard SQL editor (project yetrzecfdckzmnqwrffm).
-- Multi-statement DDL returns empty body — verify via SELECTs at the bottom.
-- Idempotent: safe to re-run.
-- ================================================================


-- ----------------------------------------------------------------
-- BLOCK 1: is_approved_member() helper
-- Required before any policy below references it.
-- Grants to both anon + authenticated: {public}-role policies evaluate
-- under anon, so revoking from anon turns empty-result reads into errors.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_approved_member()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND approved = true
      AND active = true
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_approved_member() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_approved_member() TO anon, authenticated;


-- ----------------------------------------------------------------
-- BLOCK 2: Patch existing documents rows
-- documents.file_url was written as a full public URL by getPublicUrl().
-- The bucket is now private; the app now stores bare object paths.
-- Strip the prefix and URL-decode so the storage-policy join (Block 3) matches.
-- ----------------------------------------------------------------
UPDATE public.documents
SET file_url = replace(
  replace(file_url, '/storage/v1/object/public/documents/', ''),
  '%20', ' '
)
WHERE file_url LIKE '/storage/v1/object/public/documents/%';


-- ----------------------------------------------------------------
-- BLOCK 3: Storage SELECT policy on documents bucket
-- Replaces "auth_read_documents" (any signed-in user) with a role-aware
-- join: approved+active members may download; if the document row has
-- access_roles set, the caller's role must be in the array.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "auth_read_documents" ON storage.objects;

CREATE POLICY "members_read_documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.approved  = true
        AND p.active    = true
        AND (
          -- No access_roles restriction: any approved member may read
          NOT EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.file_url = storage.objects.name
              AND d.access_roles IS NOT NULL
              AND array_length(d.access_roles, 1) > 0
          )
          OR
          -- access_roles set: caller's role must be in the array
          EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.file_url = storage.objects.name
              AND p.role::text = ANY(d.access_roles)
          )
        )
    )
  );


-- ----------------------------------------------------------------
-- BLOCK 4: prospects + prospect_notes
-- Recruiting PII — lock to is_staff() (officer/snco/nco approved+active).
-- Drops:
--   prospects_select / _update / _insert  — true / any-authenticated  (loose)
--   "Senior staff manage prospects"        — id = auth.uid()           (dead)
--   "staff_all_prospects"                  — id = auth.uid()           (dead)
--   "prospect_notes_all"                   — true                      (loose)
--   "Senior staff manage prospect notes"   — id = auth.uid()           (dead)
--   "staff_all_prospect_notes"             — id = auth.uid()           (dead)
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "prospects_select"               ON public.prospects;
DROP POLICY IF EXISTS "prospects_update"               ON public.prospects;
DROP POLICY IF EXISTS "prospects_insert"               ON public.prospects;
DROP POLICY IF EXISTS "Senior staff manage prospects"  ON public.prospects;
DROP POLICY IF EXISTS "staff_all_prospects"            ON public.prospects;

CREATE POLICY "staff_select_prospects" ON public.prospects
  FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY "staff_write_prospects" ON public.prospects
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "prospect_notes_all"                  ON public.prospect_notes;
DROP POLICY IF EXISTS "Senior staff manage prospect notes"  ON public.prospect_notes;
DROP POLICY IF EXISTS "staff_all_prospect_notes"            ON public.prospect_notes;

CREATE POLICY "staff_all_prospect_notes" ON public.prospect_notes
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());


-- ----------------------------------------------------------------
-- BLOCK 5: long_range_plan
-- Was world-readable (roles={public}, condition=true) despite name
-- saying "Staff can read". Drop all three policies; replace with
-- approved-member read + staff write.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can read long_range_plan"  ON public.long_range_plan;
DROP POLICY IF EXISTS "Officers can write long_range_plan" ON public.long_range_plan;
DROP POLICY IF EXISTS "Staff can manage lrp"            ON public.long_range_plan;

CREATE POLICY "members_read_lrp" ON public.long_range_plan
  FOR SELECT TO authenticated
  USING (public.is_approved_member());

CREATE POLICY "staff_write_lrp" ON public.long_range_plan
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());


-- ----------------------------------------------------------------
-- BLOCK 6: plan_of_day — restrict write to staff
-- pod_select (read) stays as-is; pod_write allowed any authenticated user.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "pod_write" ON public.plan_of_day;

CREATE POLICY "staff_write_pod" ON public.plan_of_day
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());


-- ----------------------------------------------------------------
-- BLOCK 7: Approved-member sweep
-- All of these back pages under (app)/ which requireProfile() gates;
-- none are public. Replace *_select_all / *_all loose policies with
-- is_approved_member().
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "announcements_select_all" ON public.announcements;
CREATE POLICY "members_read_announcements" ON public.announcements
  FOR SELECT TO authenticated
  USING (public.is_approved_member());

DROP POLICY IF EXISTS "duty_roster_select_all" ON public.duty_roster;
CREATE POLICY "members_read_duty_roster" ON public.duty_roster
  FOR SELECT TO authenticated
  USING (public.is_approved_member());

DROP POLICY IF EXISTS "photos_select" ON public.photos;
CREATE POLICY "members_read_photos" ON public.photos
  FOR SELECT TO authenticated
  USING (public.is_approved_member());

DROP POLICY IF EXISTS "photo_albums_select" ON public.photo_albums;
CREATE POLICY "members_read_photo_albums" ON public.photo_albums
  FOR SELECT TO authenticated
  USING (public.is_approved_member());

-- cadet_checklists already had cadet-self + staff policies added in the hardening pass;
-- this drops only the blanket checklist_all if it still exists alongside them.
DROP POLICY IF EXISTS "checklist_all" ON public.cadet_checklists;
CREATE POLICY "members_read_checklists" ON public.cadet_checklists
  FOR SELECT TO authenticated
  USING (public.is_approved_member());

DROP POLICY IF EXISTS "unit_settings_select" ON public.unit_settings;
CREATE POLICY "members_read_unit_settings" ON public.unit_settings
  FOR SELECT TO authenticated
  USING (public.is_approved_member());

DROP POLICY IF EXISTS "tsw_meeting_sessions" ON public.tsw_meeting_sessions;
CREATE POLICY "members_read_tsw" ON public.tsw_meeting_sessions
  FOR SELECT TO authenticated
  USING (public.is_approved_member());


-- ----------------------------------------------------------------
-- BLOCK 8: Templates
-- pod_templates: readable by all approved members ((app)/pod renders it for cadets)
-- notification_templates: staff-only (only called from settings/actions.ts:798,
--   behind officer/snco gate in settings-client.tsx:45)
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "pod_templates_select" ON public.pod_templates;
CREATE POLICY "members_read_pod_templates" ON public.pod_templates
  FOR SELECT TO authenticated
  USING (public.is_approved_member());

DROP POLICY IF EXISTS "notification_templates_select" ON public.notification_templates;
CREATE POLICY "staff_read_notification_templates" ON public.notification_templates
  FOR SELECT TO authenticated
  USING (public.is_staff());


-- ================================================================
-- VERIFICATION — results should confirm every block above worked.
-- Multi-statement DDL returns empty body; these SELECTs are the proof.
-- ================================================================

-- V1: is_approved_member() exists
SELECT proname FROM pg_proc
WHERE proname = 'is_approved_member'
  AND pronamespace = 'public'::regnamespace;

-- V2: documents rows now hold bare paths; path_matches should be true for all rows
SELECT d.id, d.name, d.file_url AS stored_path,
       o.name AS storage_name,
       (d.file_url = o.name) AS path_matches
FROM public.documents d
LEFT JOIN storage.objects o
  ON o.name = d.file_url AND o.bucket_id = 'documents';

-- V3: new storage policy exists, old one is gone
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY policyname;

-- V4: swept tables — check each has only the new scoped policy (no loose ones remain)
SELECT tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'prospects','prospect_notes','long_range_plan','plan_of_day',
    'announcements','duty_roster','photos','photo_albums',
    'cadet_checklists','unit_settings','pod_templates',
    'notification_templates','tsw_meeting_sessions'
  )
ORDER BY tablename, policyname;

-- V5: Remaining dead policies (id = auth.uid() instead of user_id = auth.uid())
-- Ideally this returns 0 rows for the tables touched above.
-- Any survivors on OTHER tables need manual repair in a follow-up.
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual::text      LIKE '%(id = (auth.uid()))%'
    OR qual::text      LIKE '%(id = auth.uid())%'
    OR with_check::text LIKE '%(id = (auth.uid()))%'
    OR with_check::text LIKE '%(id = auth.uid())%'
  )
ORDER BY tablename, policyname;
