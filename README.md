# IronHouse Bodybuilding Gym

A static website for a bodybuilding gym:

- **Weekly schedule:** a 5-day split. Each day targets one or two muscles: Chest · Back · Shoulders · Legs (quadriceps + hamstrings) · Arms (triceps + biceps/forearms), plus 2 rest days. The number of exercises per muscle depends on the level (Beginner 4/3, Intermediate 5/4, Advanced 6/5 for one-muscle/two-muscle days). Each exercise has its own sets and reps (`exercises.sets`, `reps_min`, `reps_max`). Reps are always between **10 and 14**, and the database rejects anything outside that range. Beginners do 3 sets and advanced members add 1. The goal sets the rest time.
- **Exercises by body part:** every exercise name listed under its upper- or lower-body muscle. The same list is available as the Supabase view `exercises_by_body_part`.
- **Exercise library:** 38 exercises, each with its type (compound/isolation), form (free weight, machine, cable, bodyweight), steps, tips, common mistakes, an animated demo and an AI-video prompt.
- **Equipment:** 20 pieces of equipment, with the muscles each one trains and the exercises that use it.
- **Members:** staff register subscribed members (plan length, level, goal). Each member gets a personal printable schedule.

## Run locally

It's plain HTML/CSS/JS with no build step. Serve the folder over HTTP:

```bash
npx http-server@14.1.1 -p 5173
```

Then open http://localhost:5173.

## Supabase

`js/config.js` holds the project URL and the **publishable** key. Both are safe to ship, because row level security controls access.

| Table | Who can read | Who can write |
|---|---|---|
| `muscles`, `equipment`, `exercises`, `exercise_equipment`, `schedule_days`, `schedule_day_muscles` | everyone | dashboard / SQL only |
| `members` | staff only | staff only |
| `staff` | the staff user themself | dashboard / SQL only |

The site renders straight away from the bundled `js/data.js`, then swaps in the database version once it loads. To change the program, edit the tables in the Supabase dashboard.

### Adding a staff account

1. In Supabase, go to **Authentication → Users → Add user** and create a user with an email and password.
2. In the SQL editor, run:

   ```sql
   insert into public.staff (user_id)
   select id from auth.users where email = 'coach@example.com';
   ```

3. Sign in on the website's **Members** section.

## AI exercise videos (anime style)

Each exercise has an anime-style animated demo built in. Each exercise's anime AI-video prompt is stored in `exercises.ai_video_prompt`, at the length set in `video_length_seconds` (15 s by default). The site shows that stored prompt, and builds a new one when 8 s or 30 s is chosen. To replace a demo with an AI-generated video:

1. Open the exercise and click **Copy prompt**, or use **Download all anime video prompts**.
2. Generate the clip in an AI video tool.
3. Save the clip as `videos/<exercise-id>.mp4` (for example `videos/bench-press.mp4`), **or** upload it to Supabase Storage and put its URL in `exercises.video_url`.

The video plays automatically in place of the animation.
