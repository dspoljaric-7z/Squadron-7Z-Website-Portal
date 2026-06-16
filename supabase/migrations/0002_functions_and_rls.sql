-- =========================================================
-- Helper functions (security definer, avoid RLS recursion)
-- =========================================================

create or replace function public.current_profile_id()
returns uuid
language sql security definer stable
set search_path = public
as $$
  select id from public.profiles where user_id = auth.uid();
$$;

create or replace function public.current_role()
returns user_role
language sql security definer stable
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select coalesce((select role in ('officer','nco') from public.profiles where user_id = auth.uid()), false);
$$;

create or replace function public.is_officer()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select coalesce((select role = 'officer' from public.profiles where user_id = auth.uid()), false);
$$;

create or replace function public.is_parent_of(target uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select coalesce((select parent_of = target from public.profiles where user_id = auth.uid()), false);
$$;

-- Prevent cadets/parents from elevating their own role/rank/billet/approval
create or replace function public.enforce_profile_field_restrictions()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if public.is_staff() then
    return new;
  end if;
  -- non-staff editing their own row: lock down privileged fields
  new.role := old.role;
  new.rank := old.rank;
  new.billet := old.billet;
  new.approved := old.approved;
  new.active := old.active;
  new.parent_of := old.parent_of;
  return new;
end;
$$;

create trigger enforce_profile_field_restrictions
  before update on public.profiles
  for each row execute function public.enforce_profile_field_restrictions();

-- =========================================================
-- Enable RLS
-- =========================================================
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.attendance enable row level security;
alter table public.announcements enable row level security;
alter table public.staff_notes enable row level security;
alter table public.duty_roster enable row level security;
alter table public.documents enable row level security;
alter table public.photo_albums enable row level security;
alter table public.photos enable row level security;
alter table public.invite_codes enable row level security;
alter table public.site_settings enable row level security;

-- =========================================================
-- profiles
-- =========================================================
create policy "profiles_select" on public.profiles for select
  using (
    user_id = auth.uid()
    or public.is_staff()
    or public.is_parent_of(id)
  );

create policy "profiles_insert_self" on public.profiles for insert
  with check (user_id = auth.uid());

create policy "profiles_update" on public.profiles for update
  using (
    user_id = auth.uid() or public.is_staff()
  );

-- =========================================================
-- events
-- =========================================================
create policy "events_select_all" on public.events for select
  using (auth.uid() is not null);

create policy "events_write_staff" on public.events for all
  using (public.is_staff())
  with check (public.is_staff());

-- =========================================================
-- attendance
-- =========================================================
create policy "attendance_select" on public.attendance for select
  using (
    public.is_staff()
    or cadet_id = public.current_profile_id()
    or public.is_parent_of(cadet_id)
  );

create policy "attendance_write_staff" on public.attendance for all
  using (public.is_staff())
  with check (public.is_staff());

-- =========================================================
-- announcements
-- =========================================================
create policy "announcements_select_all" on public.announcements for select
  using (auth.uid() is not null);

create policy "announcements_write_staff" on public.announcements for all
  using (public.is_staff())
  with check (public.is_staff());

-- =========================================================
-- staff_notes (officers + nco only, cadets/parents never)
-- =========================================================
create policy "staff_notes_all" on public.staff_notes for all
  using (public.is_staff())
  with check (public.is_staff());

-- =========================================================
-- duty_roster
-- =========================================================
create policy "duty_roster_select_all" on public.duty_roster for select
  using (auth.uid() is not null);

create policy "duty_roster_write_staff" on public.duty_roster for all
  using (public.is_staff())
  with check (public.is_staff());

-- =========================================================
-- documents
-- =========================================================
create policy "documents_select" on public.documents for select
  using (
    (auth.uid() is not null and public.current_role() <> 'parent' and not officer_only)
    or public.is_officer()
  );

create policy "documents_write_officer" on public.documents for all
  using (public.is_officer())
  with check (public.is_officer());

-- =========================================================
-- photo_albums / photos
-- =========================================================
create policy "albums_select" on public.photo_albums for select
  using (auth.uid() is not null and public.current_role() <> 'parent');

create policy "albums_write_officer" on public.photo_albums for all
  using (public.is_officer())
  with check (public.is_officer());

create policy "photos_select" on public.photos for select
  using (auth.uid() is not null and public.current_role() <> 'parent');

create policy "photos_write_officer" on public.photos for all
  using (public.is_officer())
  with check (public.is_officer());

-- =========================================================
-- invite_codes (officers only)
-- =========================================================
create policy "invite_codes_select_officer" on public.invite_codes for select
  using (public.is_officer());

create policy "invite_codes_write_officer" on public.invite_codes for all
  using (public.is_officer())
  with check (public.is_officer());

-- Allow anon/auth users to validate a code during registration (read-only, limited)
create policy "invite_codes_validate" on public.invite_codes for select
  using (used = false and (expires_at is null or expires_at > now()));

-- =========================================================
-- site_settings
-- =========================================================
create policy "site_settings_select_all" on public.site_settings for select
  using (true);

create policy "site_settings_write_officer" on public.site_settings for update
  using (public.is_officer())
  with check (public.is_officer());
