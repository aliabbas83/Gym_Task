-- Catalog -------------------------------------------------------------
create table public.muscles (
  id text primary key,
  name text not null,
  color text not null,
  region text not null check (region in ('Upper body', 'Lower body')),
  sort smallint not null default 0
);

create table public.equipment (
  id text primary key,
  category text not null,
  name text not null,
  description text not null default '',
  sort smallint not null default 0
);

create table public.exercises (
  id text primary key,
  muscle_id text not null references public.muscles(id) on update cascade,
  name text not null,
  type text not null check (type in ('Compound', 'Isolation')),
  form text not null,
  level text not null,
  secondary text not null default '',
  anim_pattern text not null,
  anim_hand text not null default '',
  steps text[] not null default '{}',
  tips text[] not null default '{}',
  mistakes text[] not null default '{}',
  video_url text,
  sort smallint not null default 0
);
create index exercises_muscle_idx on public.exercises (muscle_id, sort);

create table public.exercise_equipment (
  exercise_id text not null references public.exercises(id) on delete cascade on update cascade,
  equipment_id text not null references public.equipment(id) on delete cascade on update cascade,
  sort smallint not null default 0,
  primary key (exercise_id, equipment_id)
);
create index exercise_equipment_equipment_idx on public.exercise_equipment (equipment_id);

create table public.schedule_days (
  dow smallint primary key check (dow between 0 and 6),
  day_name text not null,
  title text not null
);

create table public.schedule_day_muscles (
  dow smallint not null references public.schedule_days(dow) on delete cascade,
  muscle_id text not null references public.muscles(id) on delete cascade on update cascade,
  sort smallint not null default 0,
  primary key (dow, muscle_id)
);
create index schedule_day_muscles_muscle_idx on public.schedule_day_muscles (muscle_id);

-- Staff & members -----------------------------------------------------
create table public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()));
$$;
revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

create table public.members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) between 1 and 60),
  phone text check (length(phone) <= 20),
  plan_months smallint not null check (plan_months in (1, 3, 6, 12)),
  start_date date not null default current_date,
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  goal text not null check (goal in ('hypertrophy', 'strength', 'endurance')),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index members_created_by_idx on public.members (created_by);

-- Row level security --------------------------------------------------
alter table public.muscles enable row level security;
alter table public.equipment enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_equipment enable row level security;
alter table public.schedule_days enable row level security;
alter table public.schedule_day_muscles enable row level security;
alter table public.staff enable row level security;
alter table public.members enable row level security;

-- Catalog: anyone can read, nobody writes through the public API (edit in the dashboard).
create policy "Public read" on public.muscles for select to anon, authenticated using (true);
create policy "Public read" on public.equipment for select to anon, authenticated using (true);
create policy "Public read" on public.exercises for select to anon, authenticated using (true);
create policy "Public read" on public.exercise_equipment for select to anon, authenticated using (true);
create policy "Public read" on public.schedule_days for select to anon, authenticated using (true);
create policy "Public read" on public.schedule_day_muscles for select to anon, authenticated using (true);

-- Staff can see that they are staff.
create policy "Staff read own row" on public.staff for select to authenticated using (user_id = (select auth.uid()));

-- Members: staff only.
create policy "Staff read members" on public.members for select to authenticated using ((select public.is_staff()));
create policy "Staff add members" on public.members for insert to authenticated with check ((select public.is_staff()));
create policy "Staff update members" on public.members for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "Staff remove members" on public.members for delete to authenticated using ((select public.is_staff()));
