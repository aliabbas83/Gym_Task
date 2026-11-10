-- Each gallery photo can belong to the signed-in user who uploaded it. Visitor uploads have no owner.
alter table public.workout_photos
  add column user_id uuid default auth.uid()
  references auth.users(id) on delete set null deferrable initially immediate;
create index workout_photos_user_id_idx on public.workout_photos (user_id);

-- Nobody can upload a photo under someone else's account.
alter policy "Anyone can submit a photo" on public.workout_photos
  with check (
    status = 'pending' and reviewed_at is null and reviewed_by is null
    and user_id is not distinct from (select auth.uid())
  );

create policy "Members see own photos" on public.workout_photos
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Members edit own photos" on public.workout_photos
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Members delete own photos" on public.workout_photos
  for delete to authenticated using (user_id = (select auth.uid()));

-- RLS decides which rows can change, not which columns. This guards the columns:
-- members can't move a photo or change its owner, and an edit goes back for review.
create function private.guard_member_photo_edit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- No signed-in user means the dashboard or SQL editor; staff keep full control.
  if (select auth.uid()) is null or private.is_staff() then
    return new;
  end if;
  if new.id is distinct from old.id or new.path is distinct from old.path
     or new.user_id is distinct from old.user_id or new.created_at is distinct from old.created_at then
    raise exception 'Only the caption, name and muscle of a photo can be edited.';
  end if;
  new.status := 'pending';
  new.reviewed_at := null;
  new.reviewed_by := null;
  return new;
end $$;
revoke execute on function private.guard_member_photo_edit() from public, anon, authenticated;
create trigger workout_photos_guard_member_edit
  before update on public.workout_photos
  for each row execute function private.guard_member_photo_edit();

-- Storage: members can open and delete their own files. Replacing a file stays blocked,
-- because it would swap an approved image without review.
create policy "Members view own workout photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'workout-photos' and owner_id = (select auth.uid())::text);
create policy "Members delete own workout photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'workout-photos' and owner_id = (select auth.uid())::text);
