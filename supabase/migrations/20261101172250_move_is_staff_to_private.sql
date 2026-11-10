create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()));
$$;
revoke execute on function private.is_staff() from public, anon;
grant execute on function private.is_staff() to authenticated;

drop policy "Staff read members" on public.members;
drop policy "Staff add members" on public.members;
drop policy "Staff update members" on public.members;
drop policy "Staff remove members" on public.members;
create policy "Staff read members" on public.members for select to authenticated using ((select private.is_staff()));
create policy "Staff add members" on public.members for insert to authenticated with check ((select private.is_staff()));
create policy "Staff update members" on public.members for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "Staff remove members" on public.members for delete to authenticated using ((select private.is_staff()));

drop function public.is_staff();
