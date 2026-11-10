alter table public.members
  add column photo_path text check (photo_path is null or (length(photo_path) <= 200 and photo_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]+$'));
comment on column public.members.photo_path is 'Object path of the member photo in the private member-photos storage bucket (<member id>/<file>).';

-- Private bucket: images only, max 5 MB each.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-photos', 'member-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Only staff can see, upload, replace or delete member photos.
create policy "Staff read member photos" on storage.objects for select to authenticated
  using (bucket_id = 'member-photos' and (select private.is_staff()));
create policy "Staff upload member photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'member-photos' and (select private.is_staff()));
create policy "Staff update member photos" on storage.objects for update to authenticated
  using (bucket_id = 'member-photos' and (select private.is_staff()))
  with check (bucket_id = 'member-photos' and (select private.is_staff()));
create policy "Staff delete member photos" on storage.objects for delete to authenticated
  using (bucket_id = 'member-photos' and (select private.is_staff()));

-- Let staff save photo changes on a member (the update policy already exists; this just covers the new column).
comment on table public.members is 'Subscribed gym members. Staff-only (RLS). Photos live in storage bucket member-photos.';
