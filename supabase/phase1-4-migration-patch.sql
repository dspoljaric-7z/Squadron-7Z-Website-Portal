-- =============================================================================
-- PATCH: Security fixes and column corrections for phase 1-4 migration
-- Run AFTER phase1-4-migration.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Fix allowed_emails table schema
--    Migration created column as `role_grant`; application code expects `role`
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  -- Rename role_grant → role if role_grant exists and role does not
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'allowed_emails' AND column_name = 'role_grant'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'allowed_emails' AND column_name = 'role'
  ) THEN
    ALTER TABLE allowed_emails RENAME COLUMN role_grant TO role;
  END IF;
END
$$;

ALTER TABLE allowed_emails ADD COLUMN IF NOT EXISTS full_name text;

-- Default role to 'cadet' if missing
ALTER TABLE allowed_emails ALTER COLUMN role SET DEFAULT 'cadet';

-- -----------------------------------------------------------------------------
-- 2. RLS policies for allowed_emails (command members only)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "command_select_allowed_emails" ON allowed_emails;
DROP POLICY IF EXISTS "command_insert_allowed_emails" ON allowed_emails;
DROP POLICY IF EXISTS "command_update_allowed_emails" ON allowed_emails;
DROP POLICY IF EXISTS "command_delete_allowed_emails" ON allowed_emails;

CREATE POLICY "command_select_allowed_emails" ON allowed_emails
  FOR SELECT USING (is_command());

CREATE POLICY "command_insert_allowed_emails" ON allowed_emails
  FOR INSERT WITH CHECK (is_command());

CREATE POLICY "command_update_allowed_emails" ON allowed_emails
  FOR UPDATE USING (is_command()) WITH CHECK (is_command());

CREATE POLICY "command_delete_allowed_emails" ON allowed_emails
  FOR DELETE USING (is_command());

-- Auth callback also needs to read allowed_emails to check if an email is allowed.
-- Use a SECURITY DEFINER function so the callback (service role) can check without
-- granting broad SELECT to anon. The callback already runs as service role, so this
-- is belt-and-suspenders: the policy above covers authenticated requests.
-- If the callback runs as anon/authenticated, add:
CREATE POLICY "public_check_own_email" ON allowed_emails
  FOR SELECT USING (email = auth.email());

-- -----------------------------------------------------------------------------
-- 3. RLS policies for activity_ideas
--    Table has RLS enabled but zero policies — no one can read or write.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "staff_manage_ideas" ON activity_ideas;
DROP POLICY IF EXISTS "approved_read_ideas" ON activity_ideas;

-- Approved users can view ideas
CREATE POLICY "approved_read_ideas" ON activity_ideas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = current_profile_id()
        AND approved = true
        AND active = true
    )
  );

-- Staff can insert
CREATE POLICY "staff_insert_ideas" ON activity_ideas
  FOR INSERT WITH CHECK (is_staff_member());

-- Officers can update any idea; submitter can update their own
CREATE POLICY "staff_update_ideas" ON activity_ideas
  FOR UPDATE USING (
    is_staff_member() AND (
      is_maa_or_command()
      OR submitted_by = current_profile_id()
    )
  );

-- Officers / command can delete
CREATE POLICY "command_delete_ideas" ON activity_ideas
  FOR DELETE USING (is_maa_or_command());

-- -----------------------------------------------------------------------------
-- 4. Prevent corrections backdating
--    Remove DEFAULT and add a constraint: issued_at cannot be more than 24h
--    in the past. This allows same-day recording while blocking historical edits.
-- -----------------------------------------------------------------------------
ALTER TABLE corrections ALTER COLUMN issued_at SET DEFAULT now();

-- Drop constraint if it was added before so this is idempotent
ALTER TABLE corrections DROP CONSTRAINT IF EXISTS corrections_issued_at_not_backdated;

ALTER TABLE corrections ADD CONSTRAINT corrections_issued_at_not_backdated
  CHECK (issued_at >= (now() - INTERVAL '24 hours'));

-- -----------------------------------------------------------------------------
-- 5. Staff notes — ensure cadets cannot read other cadets' notes
--    Check if a policy needs tightening (add cadet_id = current_profile_id
--    condition for non-staff readers).
-- -----------------------------------------------------------------------------
-- staff_notes already has an INSERT policy; add explicit SELECT policies:
DROP POLICY IF EXISTS "staff_read_notes" ON staff_notes;
DROP POLICY IF EXISTS "own_notes_read" ON staff_notes;

CREATE POLICY "staff_read_notes" ON staff_notes
  FOR SELECT USING (is_staff_member());

-- Cadets can only see their own notes (e.g. if they navigate to own profile)
-- This is intentionally disabled — cadets should not see staff notes about them.
-- If you want to allow it, uncomment:
-- CREATE POLICY "own_notes_read" ON staff_notes
--   FOR SELECT USING (cadet_id = current_profile_id());
