-- Subscription plans (prices in KWD, 3 decimals). Edit prices here or in the dashboard.
create table public.plans (
  id text primary key,
  name text not null,
  months smallint not null check (months between 1 and 24),
  price_kwd numeric(10,3) not null check (price_kwd > 0),
  sort smallint not null default 0,
  active boolean not null default true
);
alter table public.plans enable row level security;
create policy "Anyone can see active plans" on public.plans for select to anon, authenticated using (active);
insert into public.plans (id, name, months, price_kwd, sort) values
  ('monthly',  '1 month',   1,  15.000, 1),
  ('3-months', '3 months',  3,  40.000, 2),
  ('6-months', '6 months',  6,  75.000, 3),
  ('yearly',   '12 months', 12, 140.000, 4);

-- One row per member: access lasts until ends_at. Only the payment function writes here.
create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ends_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy "Members see own subscription" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));

-- Every checkout attempt. The price and length are copied from the plan when the invoice is made.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.plans(id),
  months smallint not null,
  amount_kwd numeric(10,3) not null,
  invoice_id text unique,
  payment_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index payments_user_id_idx on public.payments (user_id);
alter table public.payments enable row level security;
create policy "Members see own payments" on public.payments for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));

-- Staff, or a member whose subscription hasn't ended.
create function private.has_access()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private.is_staff())
      or exists (select 1 from public.subscriptions where user_id = (select auth.uid()) and ends_at > now());
$$;
revoke execute on function private.has_access() from public, anon;
grant execute on function private.has_access() to authenticated;

-- The program content is for subscribers and staff only. Muscle names stay public for the home page.
do $$
declare t text;
begin
  foreach t in array array['equipment', 'exercises', 'exercise_equipment', 'schedule_days', 'schedule_day_muscles'] loop
    execute format('drop policy "Public read" on public.%I', t);
    execute format('create policy "Subscribers read" on public.%I for select to authenticated using ((select private.has_access()))', t);
  end loop;
end $$;

-- Called only by the verify-payment edge function after MyFatoorah confirms the invoice is paid.
-- Safe to call twice for the same payment: the second call changes nothing.
create function public.activate_payment(p_payment uuid, p_invoice text, p_payment_id text, p_paid numeric)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare pay public.payments; new_end timestamptz;
begin
  select * into pay from public.payments where id = p_payment for update;
  if not found then raise exception 'Unknown payment'; end if;
  if pay.invoice_id is distinct from p_invoice then raise exception 'Invoice does not match this payment'; end if;
  if pay.status = 'paid' then
    return (select ends_at from public.subscriptions where user_id = pay.user_id);
  end if;
  if p_paid is null or p_paid < pay.amount_kwd then raise exception 'Paid amount is lower than the plan price'; end if;
  insert into public.subscriptions as s (user_id, ends_at)
    values (pay.user_id, now() + make_interval(months => pay.months))
    on conflict (user_id) do update
      set ends_at = greatest(s.ends_at, now()) + make_interval(months => pay.months), updated_at = now()
    returning ends_at into new_end;
  update public.payments set status = 'paid', payment_id = p_payment_id, paid_at = now() where id = pay.id;
  return new_end;
end $$;
revoke execute on function public.activate_payment(uuid, text, text, numeric) from public, anon, authenticated;
grant execute on function public.activate_payment(uuid, text, text, numeric) to service_role;
