-- Phase 2 features migration
-- Run after phase1-4-migration-patch.sql

-- ─── event_rsvps ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_rsvps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'not_attending', 'maybe')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, profile_id)
);

ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

-- All approved users can view RSVPs
CREATE POLICY "approved_view_rsvps" ON event_rsvps
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = current_profile_id() AND approved)
  );

-- Users can manage their own RSVP
CREATE POLICY "own_insert_rsvp" ON event_rsvps
  FOR INSERT WITH CHECK (profile_id = current_profile_id());

CREATE POLICY "own_update_rsvp" ON event_rsvps
  FOR UPDATE USING (profile_id = current_profile_id());

CREATE POLICY "own_delete_rsvp" ON event_rsvps
  FOR DELETE USING (profile_id = current_profile_id());


-- ─── announcement_reads ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcement_reads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id  UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, profile_id)
);

ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- All approved users can view reads (staff need counts, cadets need their own)
CREATE POLICY "approved_view_reads" ON announcement_reads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = current_profile_id() AND approved)
  );

-- Users can insert their own acknowledgement
CREATE POLICY "own_insert_read" ON announcement_reads
  FOR INSERT WITH CHECK (profile_id = current_profile_id());
