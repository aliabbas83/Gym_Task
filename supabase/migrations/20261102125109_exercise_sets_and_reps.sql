alter table public.exercises
  add column sets smallint not null default 3 check (sets between 2 and 6),
  add column reps_min smallint not null default 12 check (reps_min between 10 and 14),
  add column reps_max smallint not null default 14 check (reps_max between 10 and 14),
  add constraint exercises_reps_range check (reps_min <= reps_max);

comment on column public.exercises.sets is 'Working sets for an intermediate member (beginner: 3, advanced: +1).';
comment on column public.exercises.reps_min is 'Lowest reps per set — never below 10.';
comment on column public.exercises.reps_max is 'Highest reps per set — never above 14.';

update public.exercises set sets = 4, reps_min = 10, reps_max = 12 where type = 'Compound';
update public.exercises set sets = 3, reps_min = 12, reps_max = 14 where type = 'Isolation';
-- Heaviest main lifts: 10 reps
update public.exercises set sets = 4, reps_min = 10, reps_max = 10
  where id in ('bench-press', 'deadlift', 'ohp', 'back-squat', 'rdl');
-- Small shoulder muscles respond to extra volume
update public.exercises set sets = 4, reps_min = 12, reps_max = 14
  where id in ('lateral-raise', 'face-pull', 'reverse-pec-deck');

drop view public.exercises_by_body_part;
create view public.exercises_by_body_part
with (security_invoker = on) as
select
  m.region            as body_region,
  m.id                as muscle_id,
  m.name              as muscle,
  row_number() over (partition by m.id order by e.sort)::int as position,
  e.id                as exercise_id,
  e.name              as exercise,
  e.type,
  e.sets,
  case when e.reps_min = e.reps_max then e.reps_min::text else e.reps_min || '–' || e.reps_max end as reps,
  e.video_style,
  e.video_length_seconds,
  coalesce(e.video_url, 'videos/' || e.id || '.mp4') as video_path
from public.exercises e
join public.muscles m on m.id = e.muscle_id
order by case m.region when 'Upper body' then 0 else 1 end, m.sort, e.sort;

grant select on public.exercises_by_body_part to anon, authenticated;
