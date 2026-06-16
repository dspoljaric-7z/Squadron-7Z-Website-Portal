-- =========================================================
-- Registration support: invite code validation + profile
-- auto-creation via trigger on auth.users
-- =========================================================

-- Validate (and reserve) an invite code. Returns the role it grants,
-- or NULL if invalid/expired/used. Marks the code as used immediately
-- to prevent double-use races.
create or replace function public.consume_invite_code(p_code text)
returns user_role
language plpgsql security definer
set search_path = public
as $$
declare
  v_role user_role;
begin
  update public.invite_codes
     set used = true
   where code = p_code
     and used = false
     and (expires_at is null or expires_at > now())
  returning role_grant into v_role;

  return v_role;
end;
$$;

grant execute on function public.consume_invite_code(text) to anon, authenticated;

-- Automatically create a profile row whenever a new auth user is created.
-- Reads metadata passed during signUp: full_name, role, parent_of_name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_role user_role;
  v_auto_approve boolean;
  v_parent_of uuid;
  v_parent_of_name text;
begin
  v_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'cadet');

  select auto_approve_registrations into v_auto_approve from public.site_settings where id = 1;

  v_parent_of_name := new.raw_user_meta_data->>'parent_of_name';
  if v_role = 'parent' and v_parent_of_name is not null then
    select id into v_parent_of from public.profiles
      where lower(full_name) = lower(v_parent_of_name)
      limit 1;
  end if;

  insert into public.profiles (user_id, full_name, role, email, parent_of, approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    v_role,
    new.email,
    v_parent_of,
    coalesce(v_auto_approve, false)
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
