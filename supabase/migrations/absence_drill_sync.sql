-- Trigger: auto-sync approved/denied absence requests to drill attendance
-- Run in Supabase SQL editor:
-- https://supabase.com/dashboard/project/yetrzecfdckzmnqwrffm/sql

CREATE OR REPLACE FUNCTION sync_absence_to_drill_attendance()
RETURNS TRIGGER AS $$
DECLARE
  v_session_id uuid;
  v_att_status text;
BEGIN
  -- Only fire when status changes to a decided state
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('approved', 'denied') THEN
    RETURN NEW;
  END IF;

  -- Find the drill session on that date
  SELECT id INTO v_session_id
  FROM drill_sessions
  WHERE date = NEW.requested_date
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_att_status := CASE WHEN NEW.status = 'approved' THEN 'excused' ELSE 'absent' END;

  INSERT INTO drill_attendance (session_id, cadet_id, status, recorded_by, recorded_at)
  VALUES (v_session_id, NEW.cadet_id, v_att_status, NEW.reviewed_by, now())
  ON CONFLICT (session_id, cadet_id)
  DO UPDATE SET
    status      = EXCLUDED.status,
    recorded_by = EXCLUDED.recorded_by,
    recorded_at = EXCLUDED.recorded_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_absence_to_drill ON absence_requests;
CREATE TRIGGER tr_absence_to_drill
  AFTER UPDATE ON absence_requests
  FOR EACH ROW
  EXECUTE FUNCTION sync_absence_to_drill_attendance();
