-- Phase 5: In-app notification system
-- Run in Supabase Dashboard → SQL Editor

-- ─── 1. Notifications table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'general'
              CHECK (type IN ('correction', 'inspection_fail', 'inspection_pass', 'pip_opened', 'general')),
  title       TEXT NOT NULL,
  body        TEXT,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can see their own notifications
CREATE POLICY "own_select_notifications" ON notifications
  FOR SELECT USING (profile_id = current_profile_id());

-- Staff can insert notifications for any cadet
CREATE POLICY "staff_insert_notifications" ON notifications
  FOR INSERT WITH CHECK (is_staff_member());

-- Users can mark own notifications as read
CREATE POLICY "own_update_notifications" ON notifications
  FOR UPDATE USING (profile_id = current_profile_id())
  WITH CHECK (profile_id = current_profile_id());

-- ─── 2. Trigger: notify cadet when a correction is issued ────────────────────
CREATE OR REPLACE FUNCTION notify_on_correction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO notifications (profile_id, type, title, body)
  VALUES (
    NEW.cadet_id,
    'correction',
    'Correction Issued — Tier ' || NEW.tier,
    NEW.description
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_correction ON corrections;
CREATE TRIGGER trg_notify_correction
  AFTER INSERT ON corrections
  FOR EACH ROW EXECUTE FUNCTION notify_on_correction();

-- ─── 3. Trigger: notify cadet when a uniform inspection is failed ────────────
CREATE OR REPLACE FUNCTION notify_on_inspection_result()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT NEW.passed THEN
    INSERT INTO notifications (profile_id, type, title, body)
    VALUES (
      NEW.cadet_id,
      'inspection_fail',
      'Uniform Inspection — Action Required',
      COALESCE(NEW.deficiencies, 'Your uniform inspection was not passed. See your MAA for details.')
    );
  ELSE
    INSERT INTO notifications (profile_id, type, title, body)
    VALUES (
      NEW.cadet_id,
      'inspection_pass',
      'Uniform Inspection — Passed',
      COALESCE(NEW.notes, 'Your uniform inspection was passed. Good work.')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_inspection ON uniform_inspection_results;
CREATE TRIGGER trg_notify_inspection
  AFTER INSERT ON uniform_inspection_results
  FOR EACH ROW EXECUTE FUNCTION notify_on_inspection_result();

-- ─── 4. Trigger: notify cadet when a PIP is opened ───────────────────────────
CREATE OR REPLACE FUNCTION notify_on_pip()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO notifications (profile_id, type, title, body)
  VALUES (
    NEW.cadet_id,
    'pip_opened',
    'Performance Improvement Plan Opened',
    COALESCE(NEW.root_cause, 'A PIP has been opened for your record. Please speak with your supervisor.')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_pip ON pips;
CREATE TRIGGER trg_notify_pip
  AFTER INSERT ON pips
  FOR EACH ROW EXECUTE FUNCTION notify_on_pip();

-- Enable realtime for notifications so the bell updates live
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
