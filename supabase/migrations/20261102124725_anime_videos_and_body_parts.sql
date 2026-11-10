-- Anime AI video settings per exercise
alter table public.exercises
  add column video_style text not null default 'anime',
  add column video_length_seconds smallint not null default 15 check (video_length_seconds in (8, 15, 30)),
  add column ai_video_prompt text;

comment on column public.exercises.video_style is 'Style requested from the AI video tool (e.g. anime).';
comment on column public.exercises.video_length_seconds is 'Default clip length used for the AI video prompt.';
comment on column public.exercises.ai_video_prompt is 'Prompt to paste into an AI video tool; the site shows it when the chosen length matches video_length_seconds.';
comment on column public.exercises.video_url is 'Optional URL of the finished AI video; otherwise the site looks for videos/<id>.mp4.';

-- Exercise names grouped by upper / lower body part
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
  e.video_style,
  e.video_length_seconds,
  coalesce(e.video_url, 'videos/' || e.id || '.mp4') as video_path
from public.exercises e
join public.muscles m on m.id = e.muscle_id
order by case m.region when 'Upper body' then 0 else 1 end, m.sort, e.sort;

grant select on public.exercises_by_body_part to anon, authenticated;
