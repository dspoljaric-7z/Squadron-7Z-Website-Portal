CREATE INDEX IF NOT EXISTS idx_drill_attendance_cadet ON drill_attendance(cadet_id);
CREATE INDEX IF NOT EXISTS idx_qualifications_cadet ON qualifications(cadet_id);
CREATE INDEX IF NOT EXISTS idx_corrections_cadet ON corrections(cadet_id);
CREATE INDEX IF NOT EXISTS idx_attendance_cadet ON attendance(cadet_id);
CREATE INDEX IF NOT EXISTS idx_notifications_profile ON notifications(profile_id, read);
