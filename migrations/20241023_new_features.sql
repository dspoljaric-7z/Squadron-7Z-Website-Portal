-- Migration: new features (late arrival tracking, saved links, early departure requests)

-- Late arrival time tracking
ALTER TABLE drill_attendance ADD COLUMN IF NOT EXISTS arrival_time text;

-- Saved links (admin-managed quick links shown on dashboard)
CREATE TABLE IF NOT EXISTS saved_links (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  icon text,
  description text,
  visible_to text default 'all',
  sort_order integer default 0,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Early departure requests (cadets requesting to leave drill early)
CREATE TABLE IF NOT EXISTS early_departure_requests (
  id uuid primary key default gen_random_uuid(),
  cadet_id uuid references profiles(id),
  session_id uuid references drill_sessions(id),
  reason text,
  departure_time text,
  status text default 'pending',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  reviewer_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
