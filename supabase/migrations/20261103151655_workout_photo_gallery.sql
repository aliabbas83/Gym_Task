-- Public workout photo gallery: anyone can submit, staff approve before it is shown.
create table public.workout_photos (
  id uuid primary key default gen_random_uuid(),
  path text not null unique check (path ~ '^pending/[0-9a-f-]{36}\.(webp|jpg|png)$'),
  caption text not null default '' check (length(caption) <= 140),
  uploader_name text not null default '' check (length(uploader_name) <= 40),
  muscle_id text references public.muscles(id) on update cascade on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);
create index workout_photos_status_idx on public.workout_photos (status, created_at desc);
create index workout_photos_muscle_idx on public.workout_photos (muscle_id);
create index workout_photos_reviewed_by_idx on public.workout_photos (reviewed_by);
comment on table public.workout_photos is 'Visitor-submitted workout photos. Shown publicly only after staff set status = approved.';

alter table public.workout_photos enable row level security;

-- Visitors: may submit (always pending), and see approved photos only.
create policy "Anyone can submit a photo" on public.workout_photos for insert to anon, authenticated
  with check (status = 'pending' and reviewed_at is null and reviewed_by is null);
create policy "Anyone can see approved photos" on public.workout_photos for select to anon, authenticated
  using (status = 'approved');
-- Staff: see everything, approve, delete.
create policy "Staff see all photos" on public.workout_photos for select to authenticated
  using ((select private.is_staff()));
create policy "Staff review photos" on public.workout_photos for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "Staff delete photos" on public.workout_photos for delete to authenticated
  using ((select private.is_staff()));

-- Abuse guard: cap the moderation queue so the bucket can't be flooded.
create or replace function private.limit_pending_photos()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.workout_photos where status = 'pending') >= 300 then
    raise exception 'Too many photos are waiting for review — please try again later.';
  end if;
  return new;
end $$;
revoke execute on function private.limit_pending_photos() from public, anon, authenticated;
create trigger workout_photos_limit_pending before insert on public.workout_photos
  for each row execute function private.limit_pending_photos();

-- Private bucket: images only, 5 MB max.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('workout-photos', 'workout-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may upload a new file into pending/ (no overwrite, no delete).
create policy "Anyone can upload workout photos" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'workout-photos' and name ~ '^pending/[0-9a-f-]{36}\.(webp|jpg|png)$');
-- Files are readable only once their photo is approved (or by staff).
create policy "Anyone can view approved workout photos" on storage.objects for select to anon, authenticated
  using (bucket_id = 'workout-photos' and exists (
    select 1 from public.workout_photos w where w.path = storage.objects.name and w.status = 'approved'));
create policy "Staff view all workout photos" on storage.objects for select to authenticated
  using (bucket_id = 'workout-photos' and (select private.is_staff()));
create policy "Staff delete workout photos" on storage.objects for delete to authenticated
  using (bucket_id = 'workout-photos' and (select private.is_staff()));
