-- =========================================================
-- Seed data
-- =========================================================

-- An initial invite code that grants the OFFICER role.
-- Use this code on /register to create the first Officer account,
-- then (optionally) revoke it from the Admin dashboard afterwards.
insert into public.invite_codes (code, role_grant, expires_at, used)
values ('SQ7Z-OFFICER-SETUP', 'officer', now() + interval '30 days', false)
on conflict (code) do nothing;

-- A general cadet invite code for ongoing registrations.
insert into public.invite_codes (code, role_grant, expires_at, used)
values ('SQ7Z-CADET-2026', 'cadet', now() + interval '365 days', false)
on conflict (code) do nothing;

update public.site_settings
set unit_name = 'Squadron 7-Zulu & Training Ship Wasp',
    motto = 'Honor, Courage, Commitment'
where id = 1;
