-- =========================================================
-- SQ7Z Cadet Portal - Initial Schema
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- Enums
-- ---------------------------------------------------------
create type user_role as enum ('cadet', 'nco', 'officer', 'parent');
create type attendance_status as enum ('present', 'absent', 'excused');
create type announcement_priority as enum ('general', 'important', 'urgent');
create type event_type as enum ('drill', 'training', 'ceremony', 'community_service', 'other');

-- ---------------------------------------------------------
-- profiles
-- ---------------------------------------------------------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'cadet',
  rank text,
  billet text,
  bio text,
  email text,
  join_date date default current_date,
  parent_of uuid references public.profiles(id) on delete set null,
  approved boolean not null default false,
  active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);
create index profiles_parent_of_idx on public.profiles(parent_of);

-- ---------------------------------------------------------
-- events (training schedule / drill calendar)
-- ---------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz,
  location text,
  event_type event_type not null default 'drill',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_start_time_idx on public.events(start_time);

-- ---------------------------------------------------------
-- attendance
-- ---------------------------------------------------------
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  cadet_id uuid not null references public.profiles(id) on delete cascade,
  status attendance_status not null default 'absent',
  locked boolean not null default false,
  recorded_by uuid references public.profiles(id) on delete set null,
  recorded_at timestamptz not null default now(),
  unique (event_id, cadet_id)
);

create index attendance_event_idx on public.attendance(event_id);
create index attendance_cadet_idx on public.attendance(cadet_id);

-- ---------------------------------------------------------
-- announcements
-- ---------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  priority announcement_priority not null default 'general',
  image_url text,
  posted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index announcements_created_idx on public.announcements(created_at desc);

-- ---------------------------------------------------------
-- staff_notes
-- ---------------------------------------------------------
create table public.staff_notes (
  id uuid primary key default gen_random_uuid(),
  cadet_id uuid not null references public.profiles(id) on delete cascade,
  note_body text not null,
  posted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index staff_notes_cadet_idx on public.staff_notes(cadet_id);

-- ---------------------------------------------------------
-- duty_roster
-- ---------------------------------------------------------
create table public.duty_roster (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  cadet_id uuid references public.profiles(id) on delete set null,
  duty_role text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index duty_roster_event_idx on public.duty_roster(event_id);

-- ---------------------------------------------------------
-- documents
-- ---------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_url text not null,
  folder text not null default 'General',
  officer_only boolean not null default false,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index documents_folder_idx on public.documents(folder);

-- ---------------------------------------------------------
-- photo_albums / photos
-- ---------------------------------------------------------
create table public.photo_albums (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cover_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.photo_albums(id) on delete cascade,
  url text not null,
  caption text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index photos_album_idx on public.photos(album_id);

-- ---------------------------------------------------------
-- invite_codes
-- ---------------------------------------------------------
create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  role_grant user_role not null default 'cadet',
  expires_at timestamptz,
  used boolean not null default false,
  used_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- site_settings (single row)
-- ---------------------------------------------------------
create table public.site_settings (
  id int primary key default 1,
  unit_name text not null default 'Squadron 7-Zulu / TS Wasp',
  motto text not null default 'Honor, Courage, Commitment',
  logo_url text,
  auto_approve_registrations boolean not null default false,
  constraint single_row check (id = 1)
);

insert into public.site_settings (id) values (1);

-- ---------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.duty_roster
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.photo_albums
  for each row execute function public.set_updated_at();
