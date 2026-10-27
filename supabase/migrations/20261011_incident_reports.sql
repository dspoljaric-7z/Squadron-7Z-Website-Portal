create table if not exists incident_reports (
  id uuid primary key default gen_random_uuid(),
  reported_by uuid references auth.users(id),
  incident_date date not null,
  incident_time text,
  location text not null default 'Drill — NOSC Quincy',
  incident_type text not null check (incident_type in ('injury', 'medical', 'behavioral', 'property', 'other')),
  description text not null,
  cadets_involved text[] default '{}',
  witnesses text,
  follow_up_action text,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table incident_reports enable row level security;

-- Only authenticated officers can read and write
create policy "Officers manage incidents" on incident_reports
  for all using (auth.role() = 'authenticated');

-- Also add ip_hash column to contact_inquiries for rate limiting
alter table contact_inquiries add column if not exists ip_hash text;
