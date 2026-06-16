-- =========================================================
-- Realtime: add all tables to the supabase_realtime publication
-- =========================================================
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.attendance;
alter publication supabase_realtime add table public.announcements;
alter publication supabase_realtime add table public.staff_notes;
alter publication supabase_realtime add table public.duty_roster;
alter publication supabase_realtime add table public.documents;
alter publication supabase_realtime add table public.photo_albums;
alter publication supabase_realtime add table public.photos;
alter publication supabase_realtime add table public.site_settings;

-- =========================================================
-- Storage buckets
-- =========================================================
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('announcements', 'announcements', true),
  ('documents', 'documents', true),
  ('photos', 'photos', true),
  ('site', 'site', true)
on conflict (id) do nothing;

-- Anyone authenticated can read public buckets
create policy "public_read_avatars" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "public_read_announcements" on storage.objects for select
  using (bucket_id = 'announcements');
create policy "public_read_photos" on storage.objects for select
  using (bucket_id = 'photos' and auth.uid() is not null);
create policy "public_read_site" on storage.objects for select
  using (bucket_id = 'site');
create policy "auth_read_documents" on storage.objects for select
  using (bucket_id = 'documents' and auth.uid() is not null);

-- Authenticated users can upload their own avatar
create policy "upload_avatar" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid() is not null);
create policy "update_avatar" on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid() is not null);

-- Staff can upload announcement images
create policy "staff_upload_announcements" on storage.objects for insert
  with check (bucket_id = 'announcements' and public.is_staff());

-- Officers can manage documents/photos/site assets
create policy "officer_upload_documents" on storage.objects for insert
  with check (bucket_id = 'documents' and public.is_officer());
create policy "officer_delete_documents" on storage.objects for delete
  using (bucket_id = 'documents' and public.is_officer());

create policy "officer_upload_photos" on storage.objects for insert
  with check (bucket_id = 'photos' and public.is_officer());
create policy "officer_delete_photos" on storage.objects for delete
  using (bucket_id = 'photos' and public.is_officer());

create policy "officer_upload_site" on storage.objects for insert
  with check (bucket_id = 'site' and public.is_officer());
create policy "officer_update_site" on storage.objects for update
  using (bucket_id = 'site' and public.is_officer());
