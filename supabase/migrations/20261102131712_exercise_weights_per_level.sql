alter table public.exercises
  add column weight_beginner_kg numeric(5,1) not null default 0 check (weight_beginner_kg >= 0),
  add column weight_intermediate_kg numeric(5,1) not null default 0 check (weight_intermediate_kg >= 0),
  add column weight_advanced_kg numeric(5,1) not null default 0 check (weight_advanced_kg >= 0),
  add column weight_basis text not null default 'machine stack',
  add constraint exercises_weights_ordered check (weight_beginner_kg <= weight_intermediate_kg and weight_intermediate_kg <= weight_advanced_kg);

comment on column public.exercises.weight_beginner_kg is 'Starting weight (kg) for beginners at 10–14 reps.';
comment on column public.exercises.weight_intermediate_kg is 'Starting weight (kg) for intermediate members at 10–14 reps.';
comment on column public.exercises.weight_advanced_kg is 'Starting weight (kg) for advanced members at 10–14 reps.';
comment on column public.exercises.weight_basis is 'What the kg number means: total incl. bar, per dumbbell, machine stack, added to bodyweight (0 = bodyweight only), etc.';

update public.exercises x set
  weight_beginner_kg = v.b, weight_intermediate_kg = v.i, weight_advanced_kg = v.a, weight_basis = v.basis
from (values ('bench-press',40,60,90,'total incl. 20 kg bar'),('incline-db-press',12,22,34,'per dumbbell'),('decline-press',40,60,85,'total incl. 20 kg bar'),('chest-dips',0,0,15,'added to bodyweight'),('cable-crossover',7.5,12.5,20,'per cable handle'),('pec-deck',30,50,75,'machine stack'),('deadlift',60,100,150,'total incl. 20 kg bar'),('pull-up',0,0,10,'added to bodyweight'),('lat-pulldown',35,55,80,'machine stack'),('barbell-row',40,60,90,'total incl. 20 kg bar'),('seated-row',35,55,80,'machine stack'),('db-row',16,26,40,'per dumbbell'),('ohp',30,45,65,'total incl. 20 kg bar'),('seated-db-press',10,18,28,'per dumbbell'),('lateral-raise',5,8,12,'per dumbbell'),('front-raise',5,8,12,'per dumbbell'),('reverse-pec-deck',20,35,50,'machine stack'),('face-pull',15,25,35,'machine stack'),('close-grip-bench',35,55,80,'total incl. 20 kg bar'),('rope-pushdown',15,25,40,'machine stack'),('skull-crusher',15,25,40,'total incl. EZ bar'),('overhead-extension',10,18,28,'one dumbbell'),('bench-dips',0,0,20,'added to bodyweight'),('barbell-curl',20,30,45,'total incl. 20 kg bar'),('hammer-curl',8,14,20,'per dumbbell'),('preacher-curl',15,25,35,'total incl. EZ bar'),('incline-curl',6,10,16,'per dumbbell'),('reverse-curl',15,22,30,'total incl. EZ bar'),('back-squat',50,80,120,'total incl. 20 kg bar'),('leg-press',80,140,220,'plates loaded'),('hack-squat',40,80,130,'plates loaded'),('bulgarian-split-squat',8,16,26,'per dumbbell'),('leg-extension',30,50,75,'machine stack'),('rdl',40,70,110,'total incl. 20 kg bar'),('lying-leg-curl',20,35,55,'machine stack'),('seated-leg-curl',25,40,60,'machine stack'),('good-morning',20,40,60,'total incl. 20 kg bar'),('hyperextension',0,10,20,'added to bodyweight'))
  as v(id, b, i, a, basis)
where x.id = v.id;

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
  e.weight_beginner_kg,
  e.weight_intermediate_kg,
  e.weight_advanced_kg,
  e.weight_basis,
  e.video_style,
  e.video_length_seconds,
  coalesce(e.video_url, 'videos/' || e.id || '.mp4') as video_path
from public.exercises e
join public.muscles m on m.id = e.muscle_id
order by case m.region when 'Upper body' then 0 else 1 end, m.sort, e.sort;

grant select on public.exercises_by_body_part to anon, authenticated;
