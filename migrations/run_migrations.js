// Run: node migrations/run_migrations.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = `
ALTER TABLE drill_attendance ADD COLUMN IF NOT EXISTS arrival_time text;

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

SELECT 'Migrations complete' as result;
`;

const { data, error } = await supabase.rpc('exec_sql', { sql });
if (error) console.error(error);
else console.log('Done:', data);
